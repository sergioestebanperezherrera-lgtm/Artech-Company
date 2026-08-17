"use client";

import { useEffect, useRef } from "react";

const HERO_VIDEO_POSTER = "/videos/artech-hero-poster.jpg";
const HERO_VIDEO_SRC = "/videos/artech-hero-background-pingpong.mp4";

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isHeroVisible = true;

    const syncMotionPreference = () => {
      if (motionQuery.matches || !isHeroVisible || document.hidden) {
        video.pause();
        if (motionQuery.matches) {
          video.currentTime = 0;
        }
        return;
      }

      void video.play().catch(() => {
        // Autoplay can be blocked by browser policy; muted inline video usually succeeds.
      });
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isHeroVisible = Boolean(entry?.isIntersecting);
        syncMotionPreference();
      },
      {
        rootMargin: "220px 0px 260px 0px",
        threshold: 0.01,
      },
    );

    const handleVisibilityChange = () => syncMotionPreference();

    visibilityObserver.observe(video);
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      visibilityObserver.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      autoPlay
      className="artech-hero-video"
      controls={false}
      disablePictureInPicture
      loop
      muted
      playsInline
      poster={HERO_VIDEO_POSTER}
      preload="metadata"
    >
      <source media="(min-width: 641px)" src={HERO_VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
