"use client";

import PhoneInputWithCountrySelect from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function PhoneInputCustom({
  value,
  onChange,
  placeholder = "+216 XX XXX XXX",
  required = false,
  className = "",
}: PhoneInputProps) {
  return (
    <div className={`phone-input-container ${className}`}>
      <PhoneInputWithCountrySelect
        defaultCountry="TN" // Pays par défaut (Tunisie)
        international
        withCountryCallingCode
        value={value}
        onChange={(val) => onChange(val || "")}
        placeholder={placeholder}
        required={required}
        className="w-full flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-within:ring-2 focus-within:ring-indigo-500/20"
      />
    </div>
  );
}