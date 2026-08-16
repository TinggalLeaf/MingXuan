import { AlertCircle } from "lucide-react";

interface ErrorBoxProps {
  message: string;
}

export default function ErrorBox({ message }: ErrorBoxProps) {
  return (
    <div className="panel-console anim-shake flex items-start gap-2 border border-cinnabar-500/40 p-4 text-sm text-cinnabar-400">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>
        <span className="console-label mr-2 text-cinnabar-400">ERR</span>
        {message}
      </span>
    </div>
  );
}