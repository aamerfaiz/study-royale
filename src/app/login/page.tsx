import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
