import { Lister } from "@/constants/listerTheme";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { useState } from "react";
import Cropper from "react-easy-crop";
import { boundedCrop, PHOTO_CROP_ASPECT } from "@/lib/photoCropGeometry";
import type { CropperProps } from "./PhotoCropper.types";
// Adapted from Vault's ImageCropModal: grid, continuous source-pixel crop and canvas export.
export function PhotoCropper({ source, onCrop, disabled }: CropperProps) {
  const { size: designSize } = useDesktopDesign();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const button = {
    minWidth: designSize(44),
    minHeight: designSize(44),
    border: `${designSize(1)}px solid var(--sk-border)`,
    borderRadius: designSize(10),
    background: "transparent",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: designSize(12),
        color: "#121826",
        fontFamily: `${Lister.type.body}, "DM Sans", system-ui, sans-serif`,
      }}
    >
      <div
        data-testid="photo-cropper"
        style={{
          position: "relative",
          height: designSize(310),
          background: "#161B23",
          borderRadius: designSize(14),
          overflow: "hidden",
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        <Cropper
          image={source.uri}
          crop={position}
          zoom={zoom}
          aspect={PHOTO_CROP_ASPECT}
          onCropChange={(p) => !disabled && setPosition(p)}
          onZoomChange={(z) => !disabled && setZoom(z)}
          showGrid
          objectFit="contain"
          keyboardStep={designSize(8)}
          zoomSpeed={0.15}
          onCropAreaChange={(_, pixels) =>
            onCrop(boundedCrop(pixels, source.width, source.height))
          }
        />
      </div>
      <span style={{ fontSize: designSize(13) }}>
        Drag to position. Use arrow keys while the photo is focused.
      </span>
      <div
        style={{
          display: "flex",
          gap: designSize(8),
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label htmlFor="photo-crop-zoom">Zoom</label>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={disabled || zoom <= 1}
          style={button}
          onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
        >
          −
        </button>
        <input
          id="photo-crop-zoom"
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={zoom}
          disabled={disabled}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ flex: 1, minWidth: designSize(80), accentColor: "var(--sk-primary)" }}
        />
        <button
          type="button"
          aria-label="Zoom in"
          disabled={disabled || zoom >= 4}
          style={button}
          onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
        >
          +
        </button>
        <button
          type="button"
          disabled={disabled}
          style={{ ...button, padding: "0 14px" }}
          onClick={() => {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
