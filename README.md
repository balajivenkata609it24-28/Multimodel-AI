# Restho - Restaurant Website (React Version)

A modern, responsive restaurant website built with React.js featuring a dark theme with gold accents.

## Project Structure

```
src/
├── components/
│   ├── Header.js          # Navigation header with mobile menu
│   ├── Footer.js          # Footer component
│   └── PageHero.js        # Reusable page hero section with breadcrumbs
├── pages/
│   ├── Home.js            # Home page with all sections
│   ├── Menu3Col.js        # 3-column menu layout
│   ├── FoodCategory.js    # Food category grid
│   ├── Reservation.js     # Reservation form with modal
│   ├── Gallery.js         # Gallery with filtering
│   ├── Chef.js            # Chefs grid
│   ├── Shop.js            # Product shop
│   ├── FAQ.js             # FAQ section with accordion
│   └── NotFound.js        # 404 error page
├── styles/
│   └── index.css           # All styling
├── App.js                  # Main app with routing
└── index.js                # React entry point

public/
└── index.html              # HTML template
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd "path/to/New folder (2)"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Features

- **Responsive Design**: Mobile-friendly navigation and layouts
- **Multiple Pages**: Home, Menu, Food Categories, Reservation, Gallery, Chef, Shop, FAQ, 404
- **Dark Theme**: Modern dark interface with gold accents
- **Interactive Elements**:
  - Mobile menu toggle
  - Sticky header on scroll
  - Image gallery with filtering
  - Expandable FAQ section
  - Reservation form with modal confirmation
- **Navigation**: React Router for seamless page transitions

## Technologies Used

- React 18.2.0
- React Router DOM 6.20.0
- CSS Grid & Flexbox for layout
- Font Awesome 6.4.0 for icons
- Google Fonts (Playfair Display, Inter)

## Customization

### Colors
Edit the CSS variables in `src/styles/index.css`:
```css
:root {
    --color-primary: #d4af37; /* Gold */
    --color-bg-dark: #0e1112; /* Dark background */
    /* ...other variables */
}
```

### Content
Update content in individual page components located in `src/pages/`

### Font
Change fonts in `src/styles/index.css` or through Google Fonts link in `public/index.html`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## License

This project is open source and available under the MIT License.
