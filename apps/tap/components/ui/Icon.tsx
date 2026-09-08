interface IconProps {
  name: string;
  className?: string;
}

export default function Icon({ name, className = "" }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded leading-none select-none ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
