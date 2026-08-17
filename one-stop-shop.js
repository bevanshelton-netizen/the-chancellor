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

fetch('/api/one-stop-shop/services')
  .then(r => r.json())
  .then(data => {
    if (!data.ok || !Array.isArray(data.services)) throw new Error('Service desk unavailable.');
    grid.innerHTML = '';
    data.services.forEach(service => grid.appendChild(card(service)));
    status.textContent = `${data.services.length} Chancellor service pathways available.`;
  })
  .catch(error => {
    status.textContent = error.message || 'The service desk could not load. Please start with the Business Readiness Audit.';
    grid.innerHTML = '<article class="service-card"><span class="service-category">diagnose</span><h3>Business Readiness Audit</h3><span class="price-tag">R500 once-off</span><p>Start with a structured diagnosis of your business.</p><a class="button" href="/#audit">Start my audit</a></article>';
  });

document.addEventListener('click', event => {
  const link = event.target.closest('[data-service-link]');
  if (!link) return;
  try {
    sessionStorage.setItem('chancellorSelectedService', link.dataset.serviceLink);
  } catch {}
});
