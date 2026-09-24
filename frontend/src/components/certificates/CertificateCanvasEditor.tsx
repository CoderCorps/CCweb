"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Group, Rect } from "react-konva";
import useImage from "use-image";

export interface Field {
  id: string;
  field_key: string;
  x_percent: number;
  y_percent: number;
  font_size: number;
  color: string;
  text_align: string;
}

interface EditorProps {
  backgroundImageUrl: string;
  fields: Field[];
  onChange: (fields: Field[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const DraggableField = ({
  f,
  scale,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  onSelect,
  onChange,
  fields,
}: {
  f: Field;
  scale: number;
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
  onSelect: (id: string) => void;
  onChange: (fields: Field[]) => void;
  fields: Field[];
}) => {
  const textRef = useRef<any>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [sampleQr] = useImage("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CODERCORPS_PREVIEW", "anonymous");

  useEffect(() => {
    if (textRef.current && f.field_key !== "qr_code") {
      const width = textRef.current.width();
      const height = textRef.current.height();
      let ox = 0;
      if (f.text_align === "center") ox = width / 2;
      else if (f.text_align === "right") ox = width;
      let oy = height / 2;

      if (offset.x !== ox || offset.y !== oy) {
        setOffset({ x: ox, y: oy });
        textRef.current.getLayer()?.batchDraw();
      }
    }
  }, [f.text_align, f.field_key, f.font_size, scale]);

  const x = (f.x_percent / 100) * CANVAS_WIDTH;
  const y = (f.y_percent / 100) * CANVAS_HEIGHT;

  if (f.field_key === "qr_code") {
    const qrSize = CANVAS_WIDTH * 0.12;
    return (
      <Group
        ref={textRef}
        id={f.id}
        x={x}
        y={y}
        offsetY={qrSize / 2}
        draggable
        onClick={() => onSelect(f.id)}
        onTap={() => onSelect(f.id)}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          const newFields = fields.map((field) =>
            field.id === f.id
              ? {
                  ...field,
                  x_percent: (newX / CANVAS_WIDTH) * 100,
                  y_percent: (newY / CANVAS_HEIGHT) * 100,
                }
              : field
          );
          onChange(newFields);
        }}
      >
        <Rect
          width={qrSize}
          height={qrSize}
          fill="#ffffff"
          cornerRadius={6}
          shadowColor="#000000"
          shadowBlur={6}
          shadowOpacity={0.3}
          stroke="#3b82f6"
          strokeWidth={1}
        />
        {sampleQr ? (
          <KonvaImage
            image={sampleQr}
            x={6}
            y={6}
            width={qrSize - 12}
            height={qrSize - 12}
          />
        ) : (
          <Text
            text="[QR CODE]"
            fontSize={12 * scale}
            fontStyle="bold"
            fill="#000000"
            width={qrSize}
            y={qrSize / 2 - 6}
            align="center"
          />
        )}
      </Group>
    );
  }

  const fontSize = f.font_size * scale || 30 * scale;

  return (
    <Text
      ref={textRef}
      id={f.id}
      text={`{${f.field_key}}`}
      x={x}
      y={y}
      offsetX={offset.x}
      offsetY={offset.y}
      fontSize={fontSize}
      fill={f.color || "#000"}
      draggable
      onClick={() => onSelect(f.id)}
      onTap={() => onSelect(f.id)}
      onDragEnd={(e) => {
        const newX = e.target.x();
        const newY = e.target.y();

        const newFields = fields.map((field) =>
          field.id === f.id
            ? {
                ...field,
                x_percent: (newX / CANVAS_WIDTH) * 100,
                y_percent: (newY / CANVAS_HEIGHT) * 100,
              }
            : field
        );
        onChange(newFields);
      }}
    />
  );
};

const CertificateCanvasEditor: React.FC<EditorProps> = ({ backgroundImageUrl, fields, onChange, selectedId, onSelect }) => {
  const [image] = useImage(backgroundImageUrl, "anonymous");

  // Hardcode base canvas size for preview
  const CANVAS_WIDTH = 800;
  const scale = image ? CANVAS_WIDTH / image.width : 1;
  const CANVAS_HEIGHT = image ? image.height * scale : 600;

  const trRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (selectedId && trRef.current && layerRef.current) {
      const node = layerRef.current.findOne(`#${selectedId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedId, fields]);

  return (
    <div className="border border-border rounded overflow-hidden bg-muted flex justify-center items-center p-4">
      {image ? (
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={(e) => {
            const clickedOnEmpty = e.target === e.target.getStage() || e.target instanceof window.Image;
            if (clickedOnEmpty) {
              onSelect(null);
            }
          }}
        >
          <Layer ref={layerRef}>
            <KonvaImage
              image={image}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={() => {
                onSelect(null);
              }}
            />
            {fields.map((f) => (
              <DraggableField
                key={f.id}
                f={f}
                scale={scale}
                CANVAS_WIDTH={CANVAS_WIDTH}
                CANVAS_HEIGHT={CANVAS_HEIGHT}
                onSelect={onSelect}
                onChange={onChange}
                fields={fields}
              />
            ))}
            <Transformer
              ref={trRef}
              boundBoxFunc={(oldBox, newBox) => newBox}
              resizeEnabled={false}
            />
          </Layer>
        </Stage>
      ) : (
        <div>Loading image...</div>
      )}
    </div>
  );
};

export default CertificateCanvasEditor;
