"use client";

import { useRouter } from "next/navigation";

const STYLE_ID = "__dynamic_print_size__";

export default function PrintButton() {
  const router = useRouter();

  function handlePrint() {
    const root = document.querySelector<HTMLElement>(".print-root");
    if (!root) {
      window.print();
      return;
    }

    // 인쇄 시 적용될 패딩(14mm 12mm)으로 임시 전환해서 실제 높이를 측정
    const prevPadding = root.style.padding;
    root.style.padding = "14mm 12mm";
    root.getBoundingClientRect(); // reflow

    const pxToMm = (px: number) => (px * 25.4) / 96;
    const rect = root.getBoundingClientRect();
    const widthMm = pxToMm(rect.width);
    // 폰트/라인높이 미세 차이 보정용 안전 버퍼 6mm
    const heightMm = Math.ceil(pxToMm(rect.height) + 6);

    root.style.padding = prevPadding;

    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `@media print { @page { size: ${Math.ceil(widthMm)}mm ${heightMm}mm; margin: 0; } }`;
    document.head.appendChild(style);

    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => style.remove(), 2000);
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 print:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-xs text-brown-light hover:text-brown px-3 py-1.5 rounded-full border border-stone hover:bg-sand transition-colors"
      >
        ← 돌아가기
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="text-xs text-white bg-brown-dark hover:bg-brown px-4 py-1.5 rounded-full transition-colors"
      >
        PDF로 저장 / 인쇄
      </button>
    </div>
  );
}
