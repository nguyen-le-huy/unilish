import { useState, useRef, ChangeEvent } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Camera, ZoomIn, ZoomOut, Loader2, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import getCroppedImg from "@/lib/canvasUtils";
import { toast } from "sonner";

interface AvatarUploaderProps {
    currentAvatar: string;
    userName: string;
    onUpload: (file: Blob) => Promise<void>;
}

export function AvatarUploader({ currentAvatar, userName, onUpload }: AvatarUploaderProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setIsOpen(true);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string));
            reader.readAsDataURL(file);
        });
    };

    const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsLoading(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                await onUpload(croppedImage);
                setIsOpen(false);
                toast.success("Cập nhật ảnh đại diện thành công!");
            }
        } catch (e) {
            console.error(e);
            toast.error("Cập nhật ảnh thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
            />

            <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <div className="rounded-full p-1 bg-gradient-to-br from-blue-100 to-transparent">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white shadow-sm">
                        <AvatarImage src={currentAvatar} alt={userName} className="object-cover" />
                        <AvatarFallback className="text-2xl font-bold text-blue-600 bg-blue-50">
                            {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 m-1">
                    <Camera className="w-8 h-8 text-white opacity-90" />
                </div>

                {/* Badge/Icon similar to popular platforms */}
                <div className="absolute bottom-1 right-1 bg-background rounded-full p-1.5 shadow-md border border-border text-muted-foreground group-hover:text-primary transition-colors">
                    <ImagePlus className="w-4 h-4" />
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa ảnh đại diện</DialogTitle>
                        <DialogDescription>
                            Điều chỉnh hình ảnh để hiển thị tốt nhất.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative w-full h-[400px] bg-slate-900 rounded-lg overflow-hidden my-4">
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={false}
                                cropShape="round"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <ZoomOut className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <ZoomIn className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                            Hủy
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Lưu ảnh đại diện
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
