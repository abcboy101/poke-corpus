import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  global.CSS.supports = () => false;
});

test('renders', async () => {
  render(<App />);
  const linkElement = await screen.findByText(/Poké Corpus/i);
  expect(linkElement).toBeInTheDocument();
});
