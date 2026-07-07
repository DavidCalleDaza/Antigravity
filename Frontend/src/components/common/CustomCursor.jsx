import { useCustomCursor } from '../../hooks/useCustomCursor';

export default function CustomCursor() {
  useCustomCursor();

  return (
    <>
      <div className="cursor" id="cursor"></div>
      <div className="cursor-ring" id="cursorRing"></div>
    </>
  );
}
