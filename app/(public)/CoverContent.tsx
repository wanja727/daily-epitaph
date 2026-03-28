"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoverContent() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 이미 커버를 본 경우 바로 메인으로
    if (sessionStorage.getItem("coverSeen")) {
      router.replace("/main");
      return;
    }
    setVisible(true);
  }, [router]);

  function handleEnter() {
    sessionStorage.setItem("coverSeen", "1");
    router.push("/main");
  }

  if (!visible) return null;

  return (
    <div
      onClick={handleEnter}
      className="min-h-screen bg-ivory flex items-center justify-center px-6 py-12 cursor-pointer select-none"
    >
      <div className="max-w-md space-y-8 text-center animate-[fadeIn_0.8s_ease-out]">
        {/* 새벽빛 심볼 */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-linear-to-b from-gold/30 to-sage/20 flex items-center justify-center">
            <span className="text-4xl">🪨</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-brown tracking-tight">
          40일 &lsquo;빈 무덤 프로젝트&rsquo;를 시작하며
        </h1>

        <div className="space-y-6 text-sm leading-7 text-brown-light">
          <div>
            <p className="font-semibold text-olive mb-2">
              오늘도 이어지는 부활의 능력
            </p>
            <p>
              2천여 년 전 예수님의 부활은
              <br />
              예수 그리스도를 믿음으로 구원받은 사람들에게
              <br />
              오늘도 동일한 능력으로 역사합니다.
            </p>
          </div>

          <p>
            우리의 죄와 연약함이
            <br />
            그리스도와 함께 십자가에 못 박히고
            <br />
            그분의 부활과 연합하는 과정을 통해
          </p>

          <p>
            우리의 옛사람은 어느새 자취를 감추고
            <br />
            새사람의 모습이 갈수록 뚜렷하게 나타날 줄로 믿습니다.
          </p>

          <div>
            <p className="font-semibold text-olive mb-2">
              죽음에서 생명으로의 전환
            </p>
            <p>
              부활의 상징인 &lsquo;빈 무덤&rsquo;이라는 공간에서
              <br />
              나의 죽음이 예수님의 생명으로 전환되기를
              <br />
              기대하는 마음으로
              <br />
              이번 &lsquo;빈 무덤 프로젝트&rsquo;를 시작합니다.
            </p>
          </div>

          <p>
            매일매일 나는 죽고, 예수로 사는 삶의 실전편이
            <br />
            이번 프로젝트를 통해 실제적으로 일어나기를 소원합니다.
          </p>

          <p>
            이번 40일의 여정을 통해
            <br />
            예수님의 생명이 우리 안에 충만히 거하시고
            <br />
            내 대신 주님이 사시는 거룩한 변화가 있기를 사모합니다.
          </p>

          <p className="text-xs text-warm-gray italic">
            &ldquo;만일 우리가 그리스도와 함께 죽었으면
            <br />
            또한 그와 함께 살 줄을 믿노니&rdquo;
            <br />
            (로마서 6:8)
          </p>
        </div>

        <div className="pt-4">
          <span className="text-xs text-warm-gray animate-pulse">
            화면을 터치하여 시작하기
          </span>
        </div>
      </div>
    </div>
  );
}
