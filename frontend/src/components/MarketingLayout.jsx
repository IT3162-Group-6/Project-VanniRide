import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MarketingLayout() {
  return (
    <>
      <Navbar variant="public" />
      <main>
        <Outlet />
      </main>
    </>
  );
}
