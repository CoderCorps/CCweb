"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";

export interface Field {
  id: string;
  field_key: string;
  x_percent: number;
  y_percent: number;
  font_size: number;
  color: string;
}

interface EditorProps {
  backgroundImageUrl: string;
  fields: Field[];
  onChange: (fields: Field[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

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
            {fields.map((f) => {
              const x = (f.x_percent / 100) * CANVAS_WIDTH;
              const y = (f.y_percent / 100) * CANVAS_HEIGHT;
              const fontSize = (f.font_size * scale) || (30 * scale);
              
              return (
                <Text
                  key={f.id}
                  id={f.id}
                  text={`{${f.field_key}}`}
                  x={x}
                  y={y}
                  fontSize={fontSize}
                  fill={f.color || "#000"}
                  draggable
                  onClick={() => onSelect(f.id)}
                  onTap={() => onSelect(f.id)}
                  onDragEnd={(e) => {
                    const newX = e.target.x();
                    const newY = e.target.y();
                    
                    const newFields = fields.map(field => 
                      field.id === f.id ? {
                        ...field,
                        x_percent: (newX / CANVAS_WIDTH) * 100,
                        y_percent: (newY / CANVAS_HEIGHT) * 100
                      } : field
                    );
                    onChange(newFields);
                  }}
                />
              );
            })}
            {selectedId && (
              <Transformer
                ref={trRef}
                boundBoxFunc={(oldBox, newBox) => newBox}
                resizeEnabled={false}
              />
            )}
          </Layer>
        </Stage>
      ) : (
        <div>Loading image...</div>
      )}
    </div>
  );
};

export default CertificateCanvasEditor;

