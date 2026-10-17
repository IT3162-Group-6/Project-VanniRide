import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MarketingLayout() {
  return (
    <>
      <a className="skip-link" href="#public-content">Skip to main content</a>
      <Navbar variant="public" />
      <main id="public-content" tabIndex="-1">
        <Outlet />
      </main>
    </>
  );
}
