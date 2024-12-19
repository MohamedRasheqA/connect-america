import { redirect } from 'next/navigation';
import Header from './components/Header';

export default function Home() {
  <>
  <Header />
  redirect('/chat');
  </>
}
