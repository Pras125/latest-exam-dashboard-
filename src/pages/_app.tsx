import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isTestPage = router.pathname.startsWith('/test/');

  return (
    <>
      <Component {...pageProps} />
      <Toaster />
    </>
  );
} 