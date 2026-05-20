import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Avatar } from '@/components/user/avatar';

describe('Avatar — imgError reset on URL change', () => {
  it('shows initials when no avatarUrl is provided', () => {
    render(<Avatar displayName="Batbayar" size="md" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders an img when avatarUrl is provided', () => {
    render(<Avatar avatarUrl="https://example.com/photo.jpg" displayName="Batbayar" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('falls back to initials when image fails to load', async () => {
    render(<Avatar avatarUrl="https://example.com/broken.jpg" displayName="Batbayar" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    await waitFor(() => {
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.queryByRole('img')).toBeNull();
    });
  });

  it('re-renders the new image after avatarUrl changes following an error', async () => {
    const { rerender } = render(
      <Avatar avatarUrl="https://example.com/broken.jpg" displayName="Batbayar" />,
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.queryByRole('img')).toBeNull();
    });

    // Simulate user uploading a new avatar — URL changes
    rerender(<Avatar avatarUrl="https://example.com/new-photo.jpg" displayName="Batbayar" />);

    await waitFor(() => {
      const newImg = screen.getByRole('img');
      expect(newImg).toHaveAttribute('src', 'https://example.com/new-photo.jpg');
    });
  });

  it('uses ? as fallback letter when displayName is empty', () => {
    render(<Avatar displayName="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
