import React from 'react';
import { Camera, PenTool, Info } from 'lucide-react';
import { BotanicalImage } from '../ui/BotanicalImage';

export type AcademyVisualType = 'Real Photograph' | 'Botanical Illustration / Diagram';

export type AcademyDiagramId =
  | 'root-respiration-aeration'
  | 'leaf-anatomy-stomata'
  | 'disease-vs-chlorosis';

interface BotanicalAcademyVisualProps {
  title: string;
  visualType: AcademyVisualType;
  imageUrl?: string;
  diagramId?: AcademyDiagramId;
  caption: string;
  sourceCredit: string;
}

const RootRespirationDiagram: React.FC = () => (
  <svg
    viewBox="0 0 640 280"
    role="img"
    aria-label="Botanical diagram showing healthy oxygenated soil macropores vs waterlogged anaerobic root rot"
    className="w-full h-full"
  >
    <rect width="640" height="280" fill="#10251D" />
    {/* Divider */}
    <line x1="320" y1="16" x2="320" y2="264" stroke="#B6CDB4" strokeOpacity="0.25" strokeDasharray="5 5" />

    {/* Left: Healthy Aerated Rhizosphere */}
    <text x="160" y="30" textAnchor="middle" fill="#00D69A" fontSize="13" fontWeight="700" fontFamily="monospace">
      HEALTHY AERATED SOIL (25% AIR PORES)
    </text>
    <rect x="34" y="90" width="252" height="158" rx="12" fill="#2A1F18" stroke="#00D69A" strokeOpacity="0.5" />
    {/* Soil crumbs & air pockets */}
    <circle cx="84" cy="145" r="10" fill="#56C7C0" fillOpacity="0.35" stroke="#56C7C0" />
    <text x="84" y="149" textAnchor="middle" fill="#FAF7EE" fontSize="9" fontWeight="700">O₂</text>
    <circle cx="235" cy="155" r="11" fill="#56C7C0" fillOpacity="0.35" stroke="#56C7C0" />
    <text x="235" y="159" textAnchor="middle" fill="#FAF7EE" fontSize="9" fontWeight="700">O₂</text>
    <circle cx="105" cy="205" r="9" fill="#56C7C0" fillOpacity="0.35" stroke="#56C7C0" />
    <text x="105" y="209" textAnchor="middle" fill="#FAF7EE" fontSize="9" fontWeight="700">O₂</text>
    <circle cx="215" cy="215" r="9" fill="#C7F36B" fillOpacity="0.25" stroke="#C7F36B" />
    <text x="215" y="218" textAnchor="middle" fill="#C7F36B" fontSize="8">Perlite</text>
    {/* Healthy Stem & White Roots */}
    <path d="M160 44 L160 95" stroke="#00D69A" strokeWidth="7" strokeLinecap="round" />
    <path d="M160 95 C155 130, 125 160, 118 220" stroke="#FAF7EE" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M160 95 C165 135, 195 168, 205 224" stroke="#FAF7EE" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M150 135 C135 148, 120 155, 96 168" stroke="#E9F0E6" strokeWidth="2" fill="none" />
    <path d="M170 150 C188 164, 204 176, 224 192" stroke="#E9F0E6" strokeWidth="2" fill="none" />
    <text x="160" y="264" textAnchor="middle" fill="#C7F36B" fontSize="11">
      Firm ivory feeder roots · Active ATP uptake
    </text>

    {/* Right: Waterlogged Hypoxic Soil */}
    <text x="480" y="30" textAnchor="middle" fill="#FF806B" fontSize="13" fontWeight="700" fontFamily="monospace">
      WATERLOGGED HYPOXIA (ZERO O₂)
    </text>
    <rect x="354" y="90" width="252" height="158" rx="12" fill="#182C33" stroke="#FF806B" strokeOpacity="0.55" />
    <rect x="358" y="96" width="244" height="148" rx="10" fill="#2A5B6B" fillOpacity="0.45" />
    {/* Wilted Stem & Mushy Brown Roots */}
    <path d="M480 95 Q476 62, 502 52" stroke="#F5CA62" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M480 95 C478 130, 456 160, 450 205" stroke="#8C5239" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M480 95 C488 135, 512 162, 516 202" stroke="#75412C" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="458" cy="182" r="5" fill="#FF806B" fillOpacity="0.7" />
    <circle cx="508" cy="176" r="5" fill="#FF806B" fillOpacity="0.7" />
    <text x="480" y="264" textAnchor="middle" fill="#FF806B" fontSize="11">
      Anaerobic Pythium risk · Mushy dark roots
    </text>
  </svg>
);

const LeafAnatomyDiagram: React.FC = () => (
  <svg
    viewBox="0 0 640 280"
    role="img"
    aria-label="Botanical anatomy diagram showing leaf blade lamina, midrib, lateral veins, petiole, and stomatal cross-section"
    className="w-full h-full"
  >
    <rect width="640" height="280" fill="#10251D" />
    <text x="200" y="28" textAnchor="middle" fill="#C7F36B" fontSize="12" fontWeight="700" fontFamily="monospace">
      EXTERNAL LEAF MORPHOLOGY
    </text>
    {/* Leaf Blade */}
    <path
      d="M70 215 Q115 170, 128 158 C120 95, 195 50, 295 58 C280 140, 220 200, 140 176"
      fill="#174C38"
      stroke="#00D69A"
      strokeWidth="3"
    />
    {/* Midrib & Lateral Veins */}
    <path d="M70 215 Q190 120, 292 60" stroke="#C7F36B" strokeWidth="3" fill="none" />
    <path d="M162 142 L156 96" stroke="#C7F36B" strokeWidth="1.6" strokeOpacity="0.8" />
    <path d="M196 118 L194 74" stroke="#C7F36B" strokeWidth="1.6" strokeOpacity="0.8" />
    <path d="M232 96 L234 65" stroke="#C7F36B" strokeWidth="1.4" strokeOpacity="0.8" />
    <path d="M172 135 L218 152" stroke="#C7F36B" strokeWidth="1.6" strokeOpacity="0.8" />
    <path d="M208 112 L252 126" stroke="#C7F36B" strokeWidth="1.6" strokeOpacity="0.8" />

    {/* Labels */}
    <text x="306" y="64" fill="#FAF7EE" fontSize="11" fontWeight="700">Apex (Leaf Tip)</text>
    <text x="128" y="62" fill="#56C7C0" fontSize="11" fontWeight="600">Margin</text>
    <text x="218" y="185" fill="#FAF7EE" fontSize="11" fontWeight="600">Lamina (Blade)</text>
    <text x="86" y="236" fill="#F5CA62" fontSize="11" fontWeight="700">Petiole</text>

    {/* Right Panel: Stomata Guard Cell Inset */}
    <line x1="390" y1="20" x2="390" y2="260" stroke="#B6CDB4" strokeOpacity="0.25" strokeDasharray="4 4" />
    <text x="515" y="28" textAnchor="middle" fill="#56C7C0" fontSize="12" fontWeight="700" fontFamily="monospace">
      STOMATAL GAS EXCHANGE
    </text>
    <ellipse cx="515" cy="140" rx="74" ry="54" fill="#153026" stroke="#56C7C0" strokeWidth="2" />
    {/* Guard Cells */}
    <path d="M482 140 C482 106, 510 106, 510 140 C510 174, 482 174, 482 140 Z" fill="#00D69A" fillOpacity="0.7" />
    <path d="M548 140 C548 106, 520 106, 520 140 C520 174, 548 174, 548 140 Z" fill="#00D69A" fillOpacity="0.7" />
    <ellipse cx="515" cy="140" rx="7" ry="18" fill="#10251D" />
    <text x="515" y="218" textAnchor="middle" fill="#FAF7EE" fontSize="11">CO₂ In · O₂ + H₂O Vapor Out</text>
    <text x="515" y="238" textAnchor="middle" fill="#B6CDB4" fontSize="10">Concentrated on leaf undersides</text>
  </svg>
);

const DiseaseVsChlorosisDiagram: React.FC = () => (
  <svg
    viewBox="0 0 640 280"
    role="img"
    aria-label="Diagnostic visual comparison between fungal leaf spot lesions and interveinal nutrient chlorosis"
    className="w-full h-full"
  >
    <rect width="640" height="280" fill="#10251D" />
    <line x1="320" y1="16" x2="320" y2="264" stroke="#B6CDB4" strokeOpacity="0.25" strokeDasharray="5 5" />

    {/* Left: Fungal Lesion */}
    <text x="160" y="30" textAnchor="middle" fill="#FF806B" fontSize="12" fontWeight="700" fontFamily="monospace">
      FUNGAL / BACTERIAL LEAF SPOT
    </text>
    <path d="M75 210 C80 115, 160 64, 248 80 C240 168, 175 215, 75 210 Z" fill="#1D5C43" stroke="#00D69A" strokeWidth="2.5" />
    <path d="M75 210 Q160 140, 245 82" stroke="#98D8AA" strokeWidth="2" fill="none" />
    {/* Concentric necrotic lesions with yellow halos */}
    <circle cx="150" cy="142" r="18" fill="#F5CA62" fillOpacity="0.7" />
    <circle cx="150" cy="142" r="11" fill="#5A3322" />
    <circle cx="150" cy="142" r="5" fill="#2E1810" />
    <circle cx="195" cy="116" r="13" fill="#F5CA62" fillOpacity="0.7" />
    <circle cx="195" cy="116" r="7" fill="#5A3322" />
    <text x="160" y="246" textAnchor="middle" fill="#FAF7EE" fontSize="11" fontWeight="600">
      Asymmetric dark lesions + yellow halos
    </text>
    <text x="160" y="264" textAnchor="middle" fill="#FF806B" fontSize="10">
      Action: Isolate, prune infected leaf, neem IPM
    </text>

    {/* Right: Interveinal Chlorosis */}
    <text x="480" y="30" textAnchor="middle" fill="#F5CA62" fontSize="12" fontWeight="700" fontFamily="monospace">
      INTERVEINAL NUTRIENT CHLOROSIS
    </text>
    <path d="M395 210 C400 115, 480 64, 568 80 C560 168, 495 215, 395 210 Z" fill="#D9B64E" stroke="#F5CA62" strokeWidth="2.5" />
    {/* Bright Green Veins */}
    <path d="M395 210 Q480 140, 565 82" stroke="#176B45" strokeWidth="4" fill="none" />
    <path d="M452 162 L448 112" stroke="#176B45" strokeWidth="2.8" />
    <path d="M485 138 L484 90" stroke="#176B45" strokeWidth="2.8" />
    <path d="M518 114 L520 82" stroke="#176B45" strokeWidth="2.5" />
    <path d="M460 156 L512 166" stroke="#176B45" strokeWidth="2.8" />
    <path d="M494 132 L542 140" stroke="#176B45" strokeWidth="2.8" />
    <text x="480" y="246" textAnchor="middle" fill="#FAF7EE" fontSize="11" fontWeight="600">
      Symmetric yellow lamina, deep green veins
    </text>
    <text x="480" y="264" textAnchor="middle" fill="#C7F36B" fontSize="10">
      Old leaves = Mg · New leaves = Fe / pH check
    </text>
  </svg>
);

export const BotanicalAcademyVisual: React.FC<BotanicalAcademyVisualProps> = ({
  title,
  visualType,
  imageUrl,
  diagramId,
  caption,
  sourceCredit,
}) => {
  const isDiagram = visualType === 'Botanical Illustration / Diagram' && Boolean(diagramId);

  return (
    <div className="rounded-2xl overflow-hidden border border-[#174C38]/15 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D]">
      <div className="relative h-56 sm:h-64 w-full bg-[#10251D]">
        {isDiagram ? (
          diagramId === 'root-respiration-aeration' ? (
            <RootRespirationDiagram />
          ) : diagramId === 'leaf-anatomy-stomata' ? (
            <LeafAnatomyDiagram />
          ) : (
            <DiseaseVsChlorosisDiagram />
          )
        ) : (
          <BotanicalImage
            src={imageUrl}
            alt={title}
            commonName={title}
            aspectClassName="h-56 sm:h-64 w-full"
            className="w-full h-full object-cover"
          />
        )}

        {/* Clear visual type badge distinguishing Real Photographs from Educational Diagrams */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10251D]/90 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-[#FAF7EE]">
          {isDiagram ? (
            <>
              <PenTool className="w-3 h-3 text-[#BBA8F5]" />
              <span>Botanical Diagram / Illustration</span>
            </>
          ) : (
            <>
              <Camera className="w-3 h-3 text-[#00D69A]" />
              <span>Real Botanical Photograph</span>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] border-t border-[#174C38]/12 dark:border-[#00D69A]/18">
        <span className="font-medium text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A] shrink-0" />
          {caption}
        </span>
        <span className="font-mono text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4] shrink-0">
          {sourceCredit}
        </span>
      </div>
    </div>
  );
};
