import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SearchWidget from '@/components/SearchWidget' 

// Mock the Next.js Router (Required because SearchWidget uses useRouter)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
}));

describe('SearchWidget Component', () => {
  it('renders the search button', () => {
    render(<SearchWidget />)

    // 👇 This checks if a button with text "Search" exists
    // If your button says "Find", change /search/i to /find/i
    const button = screen.getByRole('button', { 
      name: /search/i 
    })

    expect(button).toBeInTheDocument()
  })
})