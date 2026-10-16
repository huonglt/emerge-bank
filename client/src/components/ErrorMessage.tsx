import { cn } from 'cn'

type Props = {
  message?: string
  className?: string
}

/**
 * An error message: under a form field, or for a failed request
 * Renders nothing when there is no message
 */
export const ErrorMessage = ({ message, className }: Props) => {
  if (!message) {
    return null
  }
  return (
    <div role="alert" className={cn('text-left text-red-700', className)}>
      {message}
    </div>
  )
}
