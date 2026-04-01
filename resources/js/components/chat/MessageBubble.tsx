import { useState, useRef, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Download, FileText, Film, Music, Image as ImageIcon, Trash2, Play, Pause, Mic } from "lucide-react";
import type { ChatMessage } from "@/types";

interface MessageBubbleProps {
    message: ChatMessage;
    isOwn: boolean;
    showAvatar?: boolean;
    onDelete?: (messageId: number) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentTypeIcon({ type }: { type: string }) {
    switch (type) {
        case "image":
            return <ImageIcon className="h-4 w-4" />;
        case "video":
            return <Film className="h-4 w-4" />;
        case "audio":
            return <Music className="h-4 w-4" />;
        default:
            return <FileText className="h-4 w-4" />;
    }
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function isFiniteDuration(d: number): boolean {
    return Number.isFinite(d) && d > 0;
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

        // Workaround for webm files that report Infinity duration:
        // Seek to a very large time to force the browser to resolve the real duration
        const onLoadedMetadata = () => {
            if (isFiniteDuration(audio.duration)) {
                durationResolved.current = true;
                setDuration(audio.duration);
            } else {
                // Force browser to calculate real duration
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

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

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

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play();
            setIsPlaying(true);
        }
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
        <div className="flex items-center gap-3 min-w-[220px]">
            <audio ref={audioRef} src={url} preload="metadata" />

            {/* Play/Pause button */}
            <div
                role="button"
                tabIndex={0}
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    isOwn
                        ? "bg-card/20 hover:bg-card/30 text-white"
                        : "bg-[hsl(var(--billing-primary))]/10 hover:bg-[hsl(var(--billing-primary))]/20 text-[hsl(var(--billing-primary))]"
                }`}
                onClick={togglePlay}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") togglePlay(); }}
            >
                {isPlaying ? (
                    <Pause className="h-5 w-5" />
                ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                )}
            </div>

            {/* Track + duration area */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Seekable track with dot thumb */}
                <div
                    ref={trackRef}
                    className="relative h-5 flex items-center cursor-pointer"
                    onClick={handleTrackClick}
                >
                    {/* Track background */}
                    <div className={`absolute left-0 right-0 h-[3px] rounded-full ${isOwn ? "bg-card/25" : "bg-border"}`} />
                    {/* Track filled */}
                    <div
                        className={`absolute left-0 h-[3px] rounded-full ${isOwn ? "bg-card" : "bg-[hsl(var(--billing-primary))]"}`}
                        style={{ width: `${progress}%` }}
                    />
                    {/* Thumb dot */}
                    <div
                        className={`absolute h-3.5 w-3.5 rounded-full -translate-x-1/2 shadow-sm transition-transform hover:scale-110 ${
                            isOwn ? "bg-card" : "bg-[hsl(var(--billing-primary))]"
                        } ${isDragging ? "scale-125" : ""}`}
                        style={{ left: `${progress}%` }}
                        onMouseDown={handleThumbDown}
                    />
                </div>

                {/* Duration + mic icon */}
                <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-medium ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                        {isPlaying || currentTime > 0
                            ? displayTime
                            : displayDuration}
                    </span>
                    <Mic className={`h-3.5 w-3.5 ${isOwn ? "text-white/40" : "text-[hsl(var(--billing-primary))]/60"}`} />
                </div>
            </div>
        </div>
    );
}

function AttachmentPreview({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
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

    // Image attachment
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

    // Audio / voice note — inline WhatsApp-style player
    if (attachment_type === "audio") {
        return (
            <div className="mb-0.5 min-w-[250px]">
                <AudioPlayer url={attachment_url} isOwn={isOwn} />
            </div>
        );
    }

    // Other file types
    return (
        <div
            className={`flex items-center gap-2.5 p-2.5 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-opacity ${
                isOwn ? "bg-card/15" : "bg-background/60"
            }`}
            onClick={handleDownload}
        >
            <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isOwn ? "bg-card/20 text-white" : "bg-muted text-muted-foreground"
                }`}
            >
                <AttachmentTypeIcon type={attachment_type || "document"} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${isOwn ? "text-white" : "text-foreground"}`}>
                    {attachment_name || "Archivo"}
                </p>
                {attachment_size && (
                    <p className={`text-[11px] ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                        {formatFileSize(attachment_size)}
                    </p>
                )}
            </div>
            <Download className={`h-4 w-4 shrink-0 ${isOwn ? "text-white/70" : "text-muted-foreground"}`} />
        </div>
    );
}

function MessageStatusDot({ status }: { status: string }) {
    const colorMap: Record<string, string> = {
        read: 'bg-emerald-500/100',
        delivered: 'bg-blue-500/100',
        sent: 'bg-blue-500/100',
        failed: 'bg-red-500/100',
    };
    const color = colorMap[status] || 'bg-blue-500/100';
    return <span className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full ${color} border-2 border-background`} />;
}

export function MessageBubble({ message, isOwn, showAvatar = true, onDelete }: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);

    if (message.type === "system") {
        return (
            <div className="flex justify-center py-2">
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
        <div
            className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {showAvatar ? (
                <Avatar className="h-7 w-7 shrink-0 mt-1">
                    <AvatarImage src={message.sender?.avatar_url || ""} />
                    <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(message.sender?.name || "U")}
                    </AvatarFallback>
                </Avatar>
            ) : (
                <div className="w-7 shrink-0" />
            )}

            <div className={`relative ${isVoiceNote ? "w-[55%] min-w-[280px] max-w-[380px]" : "max-w-[70%]"}`}>
                <div
                    className={`relative px-3 py-2 text-sm ${
                        isOwn
                            ? "bg-[hsl(var(--billing-primary))] text-white rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                    }`}
                >
                    {hasAttachment && <AttachmentPreview message={message} isOwn={isOwn} />}
                    {hasTextBody && <span>{message.body}</span>}
                    {!hasAttachment && !hasTextBody && <span>{message.body}</span>}
                    {isOwn && <MessageStatusDot status={message.status || 'sent'} />}
                </div>

                <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                    <p className="text-[10px] text-muted-foreground">
                        {formatTime(message.created_at)}
                    </p>
                    {isOwn && onDelete && showActions && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(message.id)}
                            title="Eliminar mensaje"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
