import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = {
  title: 'Login — Billing System',
  description: 'Sign in to your billing account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
