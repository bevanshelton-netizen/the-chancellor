const grid = document.querySelector('#serviceGrid');
const status = document.querySelector('#serviceStatus');

const descriptions = {
  audit: 'A structured 90-point diagnostic for serious entrepreneurs who want to understand the gaps before they scale.',
  rescue: 'Diagnose what is threatening the business and identify the most practical recovery priorities.',
  debt: 'Structured financial-distress triage with responsible routing to registered professionals where regulated intervention is required.',
  funding: 'Assess whether the business, numbers and documents are ready for a serious funding conversation.',
  'business-plan': 'Professional planning support for funding, investment, growth or internal execution.',
  'investor-pack': 'Prepare the narrative, supporting documents and financial story needed for funders or investors.',
  tenders: 'Strengthen tender documentation, capability positioning, compliance readiness and bid preparation.',
  profile: 'Create a company profile that communicates capability, credibility and commercial value.',
  sales: 'Find the weaknesses in the sales process and build a more disciplined route from enquiry to revenue.',
  marketing: 'Build a practical customer-acquisition and positioning plan around the market you actually serve.',
  startup: 'Move from idea to workable business model, launch priorities and an execution roadmap.',
  compliance: 'Identify documentation, registration and operational compliance gaps that may limit opportunities.',
  cashflow: 'Understand cash pressure, payment timing, expenses and the operational changes needed to regain control.',
  pricing: 'Check whether pricing protects margin and whether the business is making money on the work it performs.',
  growth: 'Clarify the next stage of growth, capacity, market expansion and execution priorities.',
  ai: 'Identify practical AI and automation opportunities across administration, marketing, service and operations.',
  digital: 'Plan the website, online selling, digital payments and systems required for a stronger digital business.',
  brand: 'Improve business positioning, corporate identity and the marketing material customers see first.',
  mentorship: 'Ongoing guidance, accountability and strategic support for entrepreneurs who want consistent execution.',
  emergency: 'Rapidly organise an urgent business problem and identify what must happen first, next and later.',
  unsure: 'Use the Business Readiness Audit as the front door when you know something needs attention but do not yet know what.'
};

const fallbackServices = [
  { id: 'audit', title: 'Business Readiness Audit', category: 'diagnose', price: 500, route: '/#audit' },
  { id: 'rescue', title: 'Business Rescue & Turnaround', category: 'recovery', route: '/?service=business-rescue#adviser' },
  { id: 'debt', title: 'Financial Distress & Debt Support', category: 'recovery', route: '/rescue.html' },
  { id: 'funding', title: 'Funding Readiness', category: 'capital', route: '/?service=funding#adviser' },
  { id: 'business-plan', title: 'Business Plans', category: 'capital', route: '/?service=business-plan#adviser' },
  { id: 'investor-pack', title: 'Funding & Investor Packs', category: 'capital', route: '/?service=investor-pack#adviser' },
  { id: 'tenders', title: 'Tender Readiness', category: 'opportunity', route: '/?service=tenders#adviser' },
  { id: 'profile', title: 'Company Profile', category: 'position', route: '/?service=company-profile#adviser' },
  { id: 'sales', title: 'Sales Rescue', category: 'growth', route: '/?service=sales#adviser' },
  { id: 'marketing', title: 'Marketing Strategy', category: 'growth', route: '/?service=marketing#adviser' },
  { id: 'startup', title: 'Start-a-Business Desk', category: 'startup', route: '/?service=startup#adviser' },
  { id: 'compliance', title: 'Business Compliance Check', category: 'risk', route: '/?service=compliance#adviser' },
  { id: 'cashflow', title: 'Cash-Flow Rescue', category: 'recovery', route: '/?service=cashflow#adviser' },
  { id: 'pricing', title: 'Pricing & Profitability Review', category: 'profit', route: '/?service=pricing#adviser' },
  { id: 'growth', title: 'Growth Strategy Session', category: 'growth', route: '/?service=growth#adviser' },
  { id: 'ai', title: 'AI for Business', category: 'digital', route: '/?service=ai#adviser' },
  { id: 'digital', title: 'Digital Business Setup', category: 'digital', route: '/?service=digital#adviser' },
  { id: 'brand', title: 'Brand & Corporate Identity', category: 'position', route: '/?service=brand#adviser' },
  { id: 'mentorship', title: 'Entrepreneur Mentorship', category: 'support', route: '/?service=mentorship#adviser' },
  { id: 'emergency', title: 'Business Emergency Desk', category: 'recovery', route: '/?service=emergency#adviser' },
  { id: 'unsure', title: 'I’m Not Sure What I Need', category: 'diagnose', route: '/#audit' }
];

function card(service) {
  const article = document.createElement('article');
  article.className = 'service-card';
  article.dataset.service = service.id;
  const price = service.price ? `<span class="price-tag">R${service.price} once-off</span>` : '';
  article.innerHTML = `
    <span class="service-category">${service.category}</span>
    <h3>${service.title}</h3>
    ${price}
    <p>${descriptions[service.id] || 'Start with The Chancellor and identify the right next step.'}</p>
    <a class="button ${service.id === 'debt' ? 'dark' : ''}" href="${service.route}" data-service-link="${service.id}">Start this pathway</a>
  `;
  return article;
}

function renderServices(services, message) {
  grid.innerHTML = '';
  services.forEach(service => grid.appendChild(card(service)));
  status.textContent = message || `${services.length} Chancellor service pathways available.`;
}

async function loadServices() {
  try {
    const response = await fetch('/api/one-stop-shop/services', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.includes('application/json')) throw new Error('API unavailable');
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.services) || !data.services.length) throw new Error('Service desk unavailable');
    renderServices(data.services);
  } catch {
    renderServices(fallbackServices, `${fallbackServices.length} Chancellor service pathways available.`);
  }
}

if (/\.vercel\.app$/i.test(location.hostname)) {
  const target = `https://the-chancellor.onrender.com${location.pathname}${location.search}${location.hash}`;
  location.replace(target);
} else {
  loadServices();
}

document.addEventListener('click', event => {
  const link = event.target.closest('[data-service-link]');
  if (!link) return;
  try {
    sessionStorage.setItem('chancellorSelectedService', link.dataset.serviceLink);
  } catch {}
});
