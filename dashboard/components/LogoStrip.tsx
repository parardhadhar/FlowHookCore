'use client';

import TechText from './TechText';

export default function LogoStrip() {
  return (
    <div className="logo-strip">
      <div className="techtext-vertical-up">
        <TechText
          text="FLOWHOOK"
          direction="horizontal"
          rotated="vertical-up"
          fontFamily="Outfit, system-ui, sans-serif"
          fontWeight={350}
          fontSize={115}
          letterSpacing={0.06}
          color="#ffffff"
          accentColor="#a78bfa"
          reveal="letter"
          dashLength={4}
          dashGap={2}
          strokeWidth={1.5}
          specks={16}
          selection={false}
          labels={false}
          draggable={true}
          sweep={true}
          speed={0.6}
        />
      </div>
    </div>
  );
}
