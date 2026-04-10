'use client'

interface Props {
  action: (formData: FormData) => void | Promise<void>
  label?: string
  confirmMessage: string
  className?: string
}

export default function ConfirmDeleteButton({
  action,
  label = 'Löschen',
  confirmMessage,
  className = 'px-4 py-2 text-xs text-red-500/70 hover:text-red-600 transition-colors',
}: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault()
        }}
      >
        {label}
      </button>
    </form>
  )
}
