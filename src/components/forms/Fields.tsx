import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FieldWrapperProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
  aside?: ReactNode;
}

export function FieldWrapper({ id, label, hint, error, optional, required, children, aside }: FieldWrapperProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-rose-pink" aria-hidden>*</span>}
          {optional && <span className="ml-1.5 text-xs font-normal text-ink-soft">(opcional)</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ invalid, className, id, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn('input min-h-[92px] resize-y leading-relaxed', invalid && 'input-invalid', className)}
      {...rest}
    />
  );
});

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ invalid, className, id, ...rest }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn('input', invalid && 'input-invalid', className)}
      {...rest}
    />
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; wrapperClassName?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, wrapperClassName, id, children, ...rest },
  ref,
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn('input appearance-none pr-10', invalid && 'input-invalid', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-rose-antique" aria-hidden />
    </div>
  );
});
