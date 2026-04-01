import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image, FileText, Film, Music, Mic, Square } from "lucide-react";

interface MessageInputProps {
    onSend: (body: string, attachment?: File) => Promise<void>;
    disabled?: boolean;
    isSending?: boolean;
}

// Keep onSend always fresh via ref to avoid stale closures in MediaRecorder callbacks

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_RECORDING_SECONDS = 120; // 2 minutos max

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

export function MessageInput({ onSend, disabled = false, isSending = false }: MessageInputProps) {
    const [value, setValue] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ref to always have the latest onSend (avoids stale closure in MediaRecorder.onstop)
    const onSendRef = useRef(onSend);
    useEffect(() => { onSendRef.current = onSend; }, [onSend]);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const handleSend = useCallback(async () => {
        if ((!value.trim() && !attachment) || disabled || isSending) return;
        const msg = value;
        const file = attachment;
        setValue("");
        setAttachment(null);
        setPreview(null);
        await onSend(msg, file || undefined);
    }, [value, attachment, disabled, isSending, onSend]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert("El archivo es demasiado grande. Maximo 20MB.");
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
                    // Enviar directo como nota de voz (usar ref para evitar closure obsoleto)
                    onSendRef.current("", file);
                }

                // Stop all tracks
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(250); // collect data every 250ms
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
            // Clear chunks before stopping so onstop creates an empty blob
            audioChunksRef.current = [];
            mediaRecorderRef.current.onstop = () => {
                // discard - don't set attachment
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
            <div className="border-t bg-background">
                <div className="flex items-center gap-3 p-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        className="h-10 w-10 rounded-full bg-[hsl(var(--billing-primary))] hover:bg-[hsl(var(--billing-primary))]/90 shrink-0"
                        title="Detener y enviar"
                    >
                        <Square className="h-4 w-4 fill-current" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t bg-background">
            {/* Attachment preview */}
            {attachment && (
                <div className="px-3 pt-3">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-2.5 border border-border">
                        {preview ? (
                            <img
                                src={preview}
                                alt="Preview"
                                className="h-12 w-12 rounded-md object-cover shrink-0"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                                {getFileIcon(attachment)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={removeAttachment}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2 p-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                    onChange={handleFileSelect}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    title="Adjuntar archivo"
                >
                    <Paperclip className="h-5 w-5" />
                </Button>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    disabled={disabled}
                    className="flex-1 h-10 px-4 bg-muted/50 border border-border rounded-full text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--billing-primary))]/20 focus:border-[hsl(var(--billing-primary))]/50 transition-colors"
                />

                {/* Show mic when no text/attachment, otherwise show send */}
                {!value.trim() && !attachment ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-[hsl(var(--billing-primary))] hover:bg-[hsl(var(--billing-primary))]/10"
                        onClick={startRecording}
                        disabled={disabled || isSending}
                        title="Grabar nota de voz"
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={(!value.trim() && !attachment) || disabled || isSending}
                        className="h-10 w-10 rounded-full bg-[hsl(var(--billing-primary))] hover:bg-[hsl(var(--billing-primary))]/90 shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
