import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image, FileText, Film, Music, Mic, Square } from "lucide-react";

interface SupportMessageInputProps {
    onSend: (body: string, attachment?: File) => void;
    disabled?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 120;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordingTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function getFileIcon(file: File) {
    const mime = file.type;
    if (mime.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
    if (mime.startsWith("video/")) return <Film className="h-4 w-4 text-purple-500" />;
    if (mime.startsWith("audio/")) return <Music className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-orange-500" />;
}

export function SupportMessageInput({ onSend, disabled = false }: SupportMessageInputProps) {
    const [value, setValue] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ref to always have the latest onSend
    const onSendRef = useRef(onSend);
    useEffect(() => { onSendRef.current = onSend; }, [onSend]);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    // Fire-and-forget send — never blocks the UI
    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed && !attachment) return;
        const msg = value;
        const file = attachment;
        // Clear input immediately — don't wait for API
        setValue("");
        setAttachment(null);
        setPreview(null);
        // Fire send without awaiting
        onSendRef.current(msg, file || undefined);
    }, [value, attachment]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            alert("El archivo es muy grande. Maximo 20MB.");
            return;
        }
        setAttachment(file);
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const removeAttachment = useCallback(() => {
        setAttachment(null);
        setPreview(null);
    }, []);

    // --- Audio recording ---
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm",
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (blob.size > 0) {
                    const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
                    onSendRef.current("", file);
                }
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(250);
            setIsRecording(true);
            setRecordingSeconds(0);

            timerRef.current = setInterval(() => {
                setRecordingSeconds((prev) => {
                    if (prev + 1 >= MAX_RECORDING_SECONDS) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            alert("No se pudo acceder al microfono. Verifica los permisos.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
        setRecordingSeconds(0);
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            audioChunksRef.current = [];
            mediaRecorderRef.current.onstop = () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }
            };
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
        setRecordingSeconds(0);
    }, []);

    // Recording UI
    if (isRecording) {
        return (
            <div className="border-t p-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={cancelRecording}
                        title="Cancelar"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="flex-1 flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500/100" />
                        </span>
                        <span className="text-sm font-medium text-destructive">
                            {formatRecordingTime(recordingSeconds)}
                        </span>
                        <span className="text-xs text-muted-foreground">Grabando audio...</span>
                    </div>

                    <Button
                        size="icon"
                        onClick={stopRecording}
                        className="h-9 w-9 shrink-0"
                        title="Detener y enviar"
                    >
                        <Square className="h-4 w-4 fill-current" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t p-3">
            {attachment && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted/50">
                    {preview ? (
                        <img src={preview} alt="Preview" className="h-10 w-10 rounded object-cover" />
                    ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            {getFileIcon(attachment)}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{attachment.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button onClick={removeAttachment} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            <div className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu mensaje..."
                    disabled={disabled}
                    rows={1}
                    className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[36px] max-h-[120px]"
                    style={{ height: "36px" }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "36px";
                        target.style.height = Math.min(target.scrollHeight, 120) + "px";
                    }}
                />

                {!value.trim() && !attachment ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={startRecording}
                        disabled={disabled}
                        title="Grabar nota de voz"
                    >
                        <Mic className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleSubmit}
                        disabled={disabled || (!value.trim() && !attachment)}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
