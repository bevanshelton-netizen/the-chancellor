const path = require('node:path');

module.exports = function registerOneStopShop(app) {
  const services = [
    { id: 'audit', title: 'Business Readiness Audit', category: 'diagnose', price: 500, route: '/#audit', prompt: 'I want to assess how ready my business is to grow and scale.' },
    { id: 'rescue', title: 'Business Rescue & Turnaround', category: 'recovery', route: '/?service=business-rescue#adviser', prompt: 'My business is in trouble and I need a turnaround plan.' },
    { id: 'debt', title: 'Financial Distress & Debt Support', category: 'recovery', route: '/rescue.html', prompt: 'I am under financial pressure and need help understanding the right next step.' },
    { id: 'funding', title: 'Funding Readiness', category: 'capital', route: '/?service=funding#adviser', prompt: 'I need funding and want to know whether my business is funder-ready.' },
    { id: 'business-plan', title: 'Business Plans', category: 'capital', route: '/?service=business-plan#adviser', prompt: 'I need a professional business plan.' },
    { id: 'investor-pack', title: 'Funding & Investor Packs', category: 'capital', route: '/?service=investor-pack#adviser', prompt: 'I need a funding or investor pack for a serious funding conversation.' },
    { id: 'tenders', title: 'Tender Readiness', category: 'opportunity', route: '/?service=tenders#adviser', prompt: 'I need help getting my business tender-ready.' },
    { id: 'profile', title: 'Company Profile', category: 'position', route: '/?service=company-profile#adviser', prompt: 'I need a professional company profile that sells my business properly.' },
    { id: 'sales', title: 'Sales Rescue', category: 'growth', route: '/?service=sales#adviser', prompt: 'I have a product or service but I need more customers and sales.' },
    { id: 'marketing', title: 'Marketing Strategy', category: 'growth', route: '/?service=marketing#adviser', prompt: 'I need a practical marketing strategy to generate more enquiries and customers.' },
    { id: 'startup', title: 'Start-a-Business Desk', category: 'startup', route: '/?service=startup#adviser', prompt: 'I want to start a business and need help turning the idea into a workable launch plan.' },
    { id: 'compliance', title: 'Business Compliance Check', category: 'risk', route: '/?service=compliance#adviser', prompt: 'I need to identify compliance and documentation gaps in my business.' },
    { id: 'cashflow', title: 'Cash-Flow Rescue', category: 'recovery', route: '/?service=cashflow#adviser', prompt: 'My cash flow is under pressure and I need to understand where the money is going.' },
    { id: 'pricing', title: 'Pricing & Profitability Review', category: 'profit', route: '/?service=pricing#adviser', prompt: 'I need to know whether my pricing is actually profitable.' },
    { id: 'growth', title: 'Growth Strategy Session', category: 'growth', route: '/?service=growth#adviser', prompt: 'My business is established and I want a strategy to reach the next level.' },
    { id: 'ai', title: 'AI for Business', category: 'digital', route: '/?service=ai#adviser', prompt: 'I want to use AI and automation practically in my business.' },
    { id: 'digital', title: 'Digital Business Setup', category: 'digital', route: '/?service=digital#adviser', prompt: 'I need help setting up my business online, including digital selling and payments.' },
    { id: 'brand', title: 'Brand & Corporate Identity', category: 'position', route: '/?service=brand#adviser', prompt: 'I need stronger branding and corporate positioning.' },
    { id: 'mentorship', title: 'Entrepreneur Mentorship', category: 'support', route: '/?service=mentorship#adviser', prompt: 'I want ongoing business mentorship and accountability.' },
    { id: 'emergency', title: 'Business Emergency Desk', category: 'recovery', route: '/?service=emergency#adviser', prompt: 'My business has an urgent problem and I need to know what to do first.' },
    { id: 'unsure', title: 'I’m Not Sure What I Need', category: 'diagnose', route: '/#audit', prompt: 'I am not sure what my business needs. Please diagnose the gaps first.' }
  ];

  app.get(['/one-stop-shop', '/one-stop-shop.html'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.sendFile(path.join(__dirname, 'one-stop-shop.html'));
  });

  app.get('/api/one-stop-shop/services', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, services });
  });
};
