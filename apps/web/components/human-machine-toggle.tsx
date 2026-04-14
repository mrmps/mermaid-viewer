"use client";

type Mode = "human" | "machine";

export function HumanMachineToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-4 rounded-[4px] px-2 py-1.5 bg-[rgba(34,34,34,0.8)] backdrop-blur-[12px]">
      <button
        onClick={() => onChange("human")}
        className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full ml-0.5 mb-px pointer-events-none"
          style={{
            backgroundColor:
              mode === "human" ? "#fff" : "transparent",
            boxShadow:
              mode === "human"
                ? "none"
                : "inset 0 0 0 1px rgba(255,255,255,0.4)",
          }}
        />
        <span className="block font-mono text-[13px] leading-[16px] tracking-[0.16px] uppercase text-white">
          Human
        </span>
      </button>
      <button
        onClick={() => onChange("machine")}
        className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full ml-0.5 mb-px pointer-events-none"
          style={{
            backgroundColor:
              mode === "machine" ? "#fff" : "transparent",
            boxShadow:
              mode === "machine"
                ? "none"
                : "inset 0 0 0 1px rgba(255,255,255,0.4)",
          }}
        />
        <span className="block font-mono text-[13px] leading-[16px] tracking-[0.16px] uppercase text-white">
          Machine
        </span>
      </button>
    </div>
  );
}
