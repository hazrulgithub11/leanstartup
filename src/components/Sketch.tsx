import { useMemo } from "react";
import rough from "roughjs";

type Shape = "rect" | "ellipse" | "diamond";
type FillStyle = "solid" | "hachure" | "zigzag";

export function Sketch({
  width,
  height,
  seed,
  fill,
  stroke = "#1e1e1e",
  fillStyle = "solid",
  roughness = 1.22,
  strokeWidth = 1.7,
  shape = "rect",
  hachureGap = 6,
}: {
  width: number;
  height: number;
  seed: number;
  fill?: string;
  stroke?: string;
  fillStyle?: FillStyle;
  roughness?: number;
  strokeWidth?: number;
  shape?: Shape;
  hachureGap?: number;
}) {
  const markup = useMemo(() => {
    if (width < 4 || height < 4 || typeof document === "undefined") return "";
    const host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rc = rough.svg(host);
    const options = {
      seed,
      stroke,
      strokeWidth,
      roughness,
      bowing: 0.85,
      fill: fill && fill !== "transparent" ? fill : undefined,
      fillStyle,
      hachureGap,
      fillWeight: 0.75,
    };
    const node =
      shape === "ellipse"
        ? rc.ellipse(width / 2, height / 2, Math.max(2, width - 3), Math.max(2, height - 3), options)
        : shape === "diamond"
          ? rc.polygon(
              [
                [width / 2, 3],
                [width - 3, height / 2],
                [width / 2, height - 3],
                [3, height / 2],
              ],
              options,
            )
          : rc.rectangle(1.5, 1.5, Math.max(2, width - 3), Math.max(2, height - 3), options);
    return node.outerHTML;
  }, [fill, fillStyle, hachureGap, height, roughness, seed, shape, stroke, strokeWidth, width]);

  return <svg className="sketch" width={width} height={height} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}
