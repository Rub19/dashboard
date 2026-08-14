export default function NotionLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.613 2.23 3.443 2.917 3.443 5.36v68.89c0 4.5-1.64 8.13-5.5 8.6l-64.38 7.687c-3.21.377-4.753-.373-6.427-2.917L9.643 82.943c-2.23-3.21-3.21-5.73-3.21-8.167V11.71c0-3.633 1.633-6.673 5.583-7.397z" />
    </svg>
  );
}
