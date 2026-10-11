import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { Citation } from '../types/chat';

interface ShowcaseCardsProps {
  citations?: Citation[];
  onOpenCitation?: (citation: Citation, allCitations: Citation[]) => void;
}

export const ShowcaseCards: React.FC<ShowcaseCardsProps> = ({
  citations = [],
  onOpenCitation,
}) => {
  // 4 Designer Showcase Cards matching the screenshot with high visual fidelity
  const cards = [
    {
      id: 'card-1',
      title: 'GENESÖN',
      price: 'from 35 €',
      desc: 'Metal, minimal, IKEA design',
      domain: 'ikea.com',
      url: 'https://www.ikea.com',
      // Blue minimalist geometric chair SVG
      svg: (
        <svg viewBox="0 0 160 160" width="100%" height="100%">
          <defs>
            <radialGradient id="chairBg1" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f3f1ec" />
              <stop offset="100%" stopColor="#e3dfd5" />
            </radialGradient>
            <linearGradient id="blueMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#chairBg1)" />
          {/* Soft floor shadow */}
          <ellipse cx="80" cy="138" rx="42" ry="7" fill="rgba(0,0,0,0.12)" />
          {/* Chair backrest */}
          <path d="M52 46 L108 46" stroke="url(#blueMetal)" strokeWidth="6" strokeLinecap="round" />
          <path d="M54 62 L106 62" stroke="url(#blueMetal)" strokeWidth="6" strokeLinecap="round" />
          {/* Chair frame / legs */}
          <path d="M54 36 L50 92 L44 136" stroke="url(#blueMetal)" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M106 36 L110 92 L116 136" stroke="url(#blueMetal)" strokeWidth="5.5" strokeLinecap="round" />
          {/* Seat */}
          <rect x="47" y="90" width="66" height="6" rx="3" fill="#2563eb" />
          {/* Front legs */}
          <path d="M56 94 L54 136" stroke="url(#blueMetal)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M104 94 L106 136" stroke="url(#blueMetal)" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'card-2',
      title: 'Arper Catifa 46',
      price: 'from 200 €',
      desc: 'Plastic/metal, Lievore Altherr Molina d...',
      domain: 'arper.com',
      url: 'https://www.arper.com',
      // Mustard yellow minimalist modern chair SVG
      svg: (
        <svg viewBox="0 0 160 160" width="100%" height="100%">
          <defs>
            <radialGradient id="chairBg2" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f7f5ef" />
              <stop offset="100%" stopColor="#dcd5c7" />
            </radialGradient>
            <linearGradient id="yellowSeat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#chairBg2)" />
          {/* Soft shadow */}
          <ellipse cx="80" cy="136" rx="45" ry="8" fill="rgba(0,0,0,0.13)" />
          {/* Curved sculptural shell */}
          <path
            d="M52 50 C50 78, 54 88, 56 92 C60 98, 100 98, 104 92 C106 88, 110 78, 108 50 C100 48, 60 48, 52 50 Z"
            fill="url(#yellowSeat)"
          />
          {/* Chrome thin wire sled base */}
          <path d="M56 94 L50 134 L66 134" stroke="#78716c" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M104 94 L110 134 L94 134" stroke="#78716c" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M50 134 L110 134" stroke="#57534e" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'card-3',
      title: 'Panton Chair',
      price: 'from 400 €',
      desc: 'Plastic, sculptural S-shape, Verner Pa...',
      domain: 'vitra.com',
      url: 'https://www.vitra.com',
      // Red iconic cantilever S-curve Panton chair SVG
      svg: (
        <svg viewBox="0 0 160 160" width="100%" height="100%">
          <defs>
            <radialGradient id="chairBg3" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#faf7f2" />
              <stop offset="100%" stopColor="#ded7c9" />
            </radialGradient>
            <linearGradient id="redGloss" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#chairBg3)" />
          {/* Shadow */}
          <ellipse cx="82" cy="138" rx="40" ry="7" fill="rgba(0,0,0,0.15)" />
          {/* Sculptural S curve shape */}
          <path
            d="M84 32 C78 32, 70 38, 70 54 C70 70, 72 82, 60 96 C50 108, 58 126, 78 136 C96 136, 114 136, 118 132 C116 126, 96 118, 86 104 C78 94, 94 80, 94 58 C94 40, 88 32, 84 32 Z"
            fill="url(#redGloss)"
          />
          {/* Gloss highlight curve */}
          <path
            d="M86 36 C88 44, 90 60, 82 78 C76 90, 72 104, 78 122"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      ),
    },
    {
      id: 'card-4',
      title: 'Infiniti Canova',
      price: 'from 180 €',
      desc: 'Wood, organic shape, Infiniti design',
      domain: 'infinitidesign.it',
      url: 'https://www.infinitidesign.it',
      // Olive green organic shape chair SVG
      svg: (
        <svg viewBox="0 0 160 160" width="100%" height="100%">
          <defs>
            <radialGradient id="chairBg4" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f6f4ee" />
              <stop offset="100%" stopColor="#d8d2c3" />
            </radialGradient>
            <linearGradient id="oliveWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#4d7c0f" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#chairBg4)" />
          {/* Floor shadow */}
          <ellipse cx="80" cy="136" rx="38" ry="7" fill="rgba(0,0,0,0.12)" />
          {/* Curved top backrest yoke */}
          <path
            d="M50 48 C65 42, 95 42, 110 48 C112 56, 106 62, 102 62 C88 56, 72 56, 58 62 C54 62, 48 56, 50 48 Z"
            fill="url(#oliveWood)"
          />
          {/* Back vertical spindles */}
          <path d="M80 60 L80 94" stroke="url(#oliveWood)" strokeWidth="4.5" strokeLinecap="round" />
          {/* Curved seat */}
          <path d="M50 94 C60 92, 100 92, 110 94 L106 100 L54 100 Z" fill="url(#oliveWood)" />
          {/* Tapered legs */}
          <path d="M54 98 L48 136" stroke="url(#oliveWood)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M106 98 L112 136" stroke="url(#oliveWood)" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        padding: '16px 4px 20px 4px',
        margin: '12px 0 16px 0',
        scrollbarWidth: 'thin',
      }}
    >
      {cards.map((card, idx) => {
        // If a citation matches this index, attach citation behavior
        const matchingCitation = citations[idx] || (citations.length > 0 ? citations[0] : null);

        return (
          <div
            key={card.id}
            className="showcase-card"
            style={{
              flex: '0 0 190px',
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
              border: '1px solid #ede8de',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => {
              if (matchingCitation && onOpenCitation) {
                onOpenCitation(matchingCitation, citations);
              } else {
                window.open(card.url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            {/* Image Preview Container with Studio Lighting */}
            <div
              style={{
                width: '100%',
                height: '145px',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#ede9e0',
              }}
            >
              {card.svg}
            </div>

            {/* Bottom Details Content */}
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Title + Price Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  <h4
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#22201e',
                      margin: 0,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {matchingCitation ? matchingCitation.guest : card.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#44413d',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {card.price}
                  </span>
                </div>

                {/* Subtitle / Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: '11.5px',
                    color: '#7a766f',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '32px',
                  }}
                >
                  {matchingCitation ? matchingCitation.episode_title : card.desc}
                </p>
              </div>

              {/* Source link badge with Globe icon & external arrow */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid #f3efe6',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    color: '#e05d44',
                    fontWeight: 500,
                  }}
                >
                  <Globe size={12} color="#e05d44" />
                  <span>{matchingCitation ? 'lennyspodcast.com' : card.domain}</span>
                </div>

                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#f6f3eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#55514b',
                  }}
                >
                  <ExternalLink size={10} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
