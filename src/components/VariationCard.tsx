import React from "react";

interface VariationCardProps {
  variation: string;
}

const VariationCard: React.FC<VariationCardProps> = ({ variation }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center min-h-[100px] text-center border border-gray-100 hover:shadow-md transition">
      <span className="text-gray-800 text-base">{variation}</span>
    </div>
  );
};

export default VariationCard; 