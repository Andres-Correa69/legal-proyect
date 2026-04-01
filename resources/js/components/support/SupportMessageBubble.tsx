import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Download, FileText, Film, Music, Image as ImageIcon, Play, Pause, Mic } from "lucide-react";
import type { SupportMessage } from "@/types";

interface SupportMessageBubbleProps {
    message: SupportMessage;
    isOwn: boolean;
    showSender: boolean;
}

function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function isFiniteDuration(d: number): boolean {
    return Number.isFinite(d) && d > 0;
}

function AttachmentTypeIcon({ type }: { type: string }) {
    switch (type) {
        case "image": return <ImageIcon className="h-4 w-4" />;
        case "video": return <Film className="h-4 w-4" />;
        case "audio": return <Music className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
    }
}

function AudioPlayer({ url, isOwn }: { url: string; isOwn: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const durationResolved = useRef(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const trySetDuration = () => {
            if (isFiniteDuration(audio.duration) && !durationResolved.current) {
                durationResolved.current = true;
                setDuration(audio.duration);
            }
        };

        const onLoadedMetadata = () => {
            if (isFiniteDuration(audio.duration)) {
                durationResolved.current = true;
                setDuration(audio.duration);
            } else {
                audio.currentTime = 1e10;
            }
        };

        const onSeeked = () => {
            if (!durationResolved.current && isFiniteDuration(audio.duration)) {
                durationResolved.current = true;
                setDuration(audio.duration);
                audio.currentTime = 0;
            }
        };

        const onDurationChange = () => trySetDuration();
        const onTimeUpdate = () => {
            trySetDuration();
            if (!isDragging) setCurrentTime(audio.currentTime);
        };
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

        audio.addEventListener("loadedmetadata", onLoadedMetadata);
        audio.addEventListener("durationchange", onDurationChange);
        audio.addEventListener("seeked", onSeeked);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            audio.removeEventListener("durationchange", onDurationChange);
            audio.removeEventListener("seeked", onSeeked);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended", onEnded);
        };
    }, [isDragging]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) { audio.pause(); setIsPlaying(false); }
        else { audio.play(); setIsPlaying(true); }
    }, [isPlaying]);

    const seekToPosition = useCallback((clientX: number) => {
        const audio = audioRef.current;
        const track = trackRef.current;
        if (!audio || !track || !duration) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = ratio * duration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        seekToPosition(e.clientX);
    }, [seekToPosition]);

    const handleThumbDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        const onMove = (ev: MouseEvent) => seekToPosition(ev.clientX);
        const onUp = () => {
            setIsDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [seekToPosition]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const displayDuration = isFiniteDuration(duration) ? formatDuration(duration) : "0:00";
    const displayTime = isFiniteDuration(currentTime) ? formatDuration(currentTime) : "0:00";

    return (
        <div className="flex items-center gap-3 min-w-[200px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            <div
                role="button"
                tabIndex={0}
                className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    isOwn ? "bg-card/20 hover:bg-card/30 text-white" : "bg-primary/10 hover:bg-primary/20 text-primary"
                )}
                onClick={togglePlay}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") togglePlay(); }}
            >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer" onClick={handleTrackClick}>
                    <div className={cn("absolute left-0 right-0 h-[3px] rounded-full", isOwn ? "bg-card/25" : "bg-border")} />
                    <div
                        className={cn("absolute left-0 h-[3px] rounded-full", isOwn ? "bg-card" : "bg-primary")}
                        style={{ width: `${progress}%` }}
                    />
                    <div
                        className={cn(
                            "absolute h-3 w-3 rounded-full -translate-x-1/2 shadow-sm transition-transform hover:scale-110",
                            isOwn ? "bg-card" : "bg-primary",
                            isDragging ? "scale-125" : ""
                        )}
                        style={{ left: `${progress}%` }}
                        onMouseDown={handleThumbDown}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className={cn("text-[11px] font-medium", isOwn ? "text-white/70" : "text-muted-foreground")}>
                        {isPlaying || currentTime > 0 ? displayTime : displayDuration}
                    </span>
                    <Mic className={cn("h-3 w-3", isOwn ? "text-white/40" : "text-primary/60")} />
                </div>
            </div>
        </div>
    );
}

function AttachmentPreview({ message, isOwn }: { message: SupportMessage; isOwn: boolean }) {
    const { attachment_url, attachment_name, attachment_type, attachment_size } = message;
    if (!attachment_url) return null;

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = attachment_url;
        link.download = attachment_name || "archivo";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
    };

    if (attachment_type === "image") {
        return (
            <div className="mb-1">
                <a href={attachment_url} target="_blank" rel="noopener noreferrer">
                    <img
                        src={attachment_url}
                        alt={attachment_name || "Imagen"}
                        className="max-w-[280px] max-h-[300px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                </a>
            </div>
        );
    }

    if (attachment_type === "audio") {
        return (
            <div className="mb-0.5 min-w-[230px]">
                <AudioPlayer url={attachment_url} isOwn={isOwn} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex items-center gap-2.5 p-2 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-opacity",
                isOwn ? "bg-card/15" : "bg-background/60"
            )}
            onClick={handleDownload}
        >
            <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                isOwn ? "bg-card/20 text-white" : "bg-muted text-muted-foreground"
            )}>
                <AttachmentTypeIcon type={attachment_type || "document"} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm truncate", isOwn ? "text-white" : "text-foreground")}>
                    {attachment_name || "Archivo"}
                </p>
                {attachment_size && (
                    <p className={cn("text-[11px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
                        {formatFileSize(attachment_size)}
                    </p>
                )}
            </div>
            <Download className={cn("h-4 w-4 shrink-0", isOwn ? "text-white/70" : "text-muted-foreground")} />
        </div>
    );
}

export function SupportMessageBubble({ message, isOwn, showSender }: SupportMessageBubbleProps) {
    if (message.type === "system") {
        return (
            <div className="flex justify-center my-2">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {message.body}
                </span>
            </div>
        );
    }

    const hasAttachment = !!message.attachment_url;
    const isVoiceNote = hasAttachment && message.attachment_type === "audio";
    const autoLabels = ["Imagen", "Video", "Audio", "Documento", "Archivo adjunto"];
    const hasTextBody = message.body && !autoLabels.includes(message.body);

    return (
        <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
                "space-y-0.5",
                isVoiceNote ? "w-[55%] min-w-[260px] max-w-[350px]" : "max-w-[75%]",
                isOwn ? "items-end" : "items-start"
            )}>
                {showSender && !isOwn && (
                    <p className="text-[10px] font-medium text-muted-foreground ml-3">
                        {message.sender_name}
                        {message.sender_type === "admin" && (
                            <span className="ml-1 text-primary">(Soporte)</span>
                        )}
                    </p>
                )}
                <div
                    className={cn(
                        "px-3 py-2 rounded-2xl text-sm",
                        isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                    )}
                >
                    {hasAttachment && <AttachmentPreview message={message} isOwn={isOwn} />}
                    {hasTextBody && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                    {!hasAttachment && !hasTextBody && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                </div>
                <p className={cn("text-[10px] text-muted-foreground", isOwn ? "text-right mr-1" : "ml-3")}>
                    {formatTime(message.created_at)}
                </p>
            </div>
        </div>
    );
}
