import React from 'react'

const COLUMNS = [
  {
    title: 'Online Shopping',
    links: ['Men', 'Women', 'Kids', 'Home & Living', 'Beauty', 'Gift Cards', 'Myntra Insider'],
  },
  {
    title: 'Customer Policies',
    links: ['Contact Us', 'FAQ', 'T&C', 'Terms Of Use', 'Track Orders', 'Shipping', 'Cancellation', 'Returns', 'Privacy policy'],
  },
  {
    title: 'Experience Myntra App',
    links: ['Android App', 'iOS App'],
  },
]

export default function Footer() {
  return (
    <footer className="mt-12 bg-shell border-t border-line">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink">{column.title}</p>
            <ul className="mt-3 space-y-1.5">
              {column.links.map((link) => (
                <li key={link} className="text-[13px] text-muted">{link}</li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink">100% Original</p>
          <p className="mt-3 text-[13px] text-muted leading-relaxed">
            Guarantee for all products at myntra.com. Easy 14 day returns and exchanges.
          </p>
          <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink">AI Style Preview</p>
          <p className="mt-3 text-[13px] text-muted leading-relaxed">
            Style guidance for wishlisted pieces. Not a virtual try-on and not a guarantee of fit.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4 text-[12px] text-muted flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} www.myntra.com. All rights reserved.</p>
          <p>Internal product prototype — AI Wishlist Style Preview</p>
        </div>
      </div>
    </footer>
  )
}
