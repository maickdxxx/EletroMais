import { useEffect, useState } from "react";
import { CorujaContentGate, CorujaProvider, buildWhatsAppHref, useCollection, useContent, useTelHref, useWhatsAppUrl } from "./coruja-template/content.jsx";
import { fetchCorujaBlogPost, fetchCorujaBlogPosts } from "./coruja-template/api.js";

function previewBase() {
  if (typeof window === "undefined") return "";
  const raw = String(window.__CORUJA_PREVIEW_BASE_PATH__ || "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}
function siteHref(path = "/") {
  const base = previewBase();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
function currentRoute() {
  if (typeof window === "undefined") return "/";
  let pathname = window.location.pathname || "/";
  const base = previewBase();
  if (base && pathname.startsWith(base)) pathname = pathname.slice(base.length) || "/";
  return pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
}
function currentSlug() { const match = currentRoute().match(/^\/blog\/([^/]+)$/); return match ? decodeURIComponent(match[1]) : ""; }
function setMeta(name, content, attr = "name") {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
  tag.setAttribute("content", content);
}
function setLink(rel, href) {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) { tag = document.createElement("link"); tag.rel = rel; document.head.appendChild(tag); }
  tag.href = href;
}
function SeoManager({ post }) {
  const route = currentRoute();
  const pageId = route === "/servicos" ? "services" : route === "/sobre" ? "about" : route === "/contato" ? "contact" : route.startsWith("/blog") ? "blog" : "home";
  const globalTitle = useContent("global.seo.title", "");
  const globalDescription = useContent("global.seo.description", "");
  const pageTitle = useContent(`pages.${pageId}.seo.title`, globalTitle);
  const pageDescription = useContent(`pages.${pageId}.seo.description`, globalDescription);
  const pageImage = useContent(`pages.${pageId}.seo.ogImage`, useContent("global.seo.ogImage", ""));
  const canonicalBase = useContent("global.seo.canonicalBase", "");
  const favicon = useContent("global.brand.faviconUrl", "/favicon.svg");
  const brand = useContent("global.brand.name", "");
  const phone = useContent("global.contact.phoneRaw", "");
  const address = useContent("global.contact.address", "");
  const serviceArea = useContent("global.contact.serviceArea", "");
  useEffect(() => {
    const title = post?.seoTitle || post?.title || pageTitle || globalTitle;
    const description = post?.seoDescription || post?.excerpt || pageDescription || globalDescription;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", post ? "article" : "website", "property");
    if (pageImage) setMeta("og:image", pageImage, "property");
    setLink("icon", favicon);
    const suffix = post ? `/blog/${post.slug}` : route;
    if (canonicalBase) setLink("canonical", `${canonicalBase.replace(/\/+$/, "")}${suffix === "/" ? "" : suffix}`);
    const id = "coruja-electrician-schema";
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id; script.type = "application/ld+json";
    script.textContent = JSON.stringify({ "@context":"https://schema.org", "@type":"Electrician", name:brand, telephone:phone, address, areaServed:serviceArea, url:canonicalBase || undefined });
    document.head.appendChild(script);
    return () => script.remove();
  }, [post, pageTitle, pageDescription, pageImage, globalTitle, globalDescription, canonicalBase, favicon, brand, phone, address, serviceArea, route]);
  return null;
}
function Bolt() { return <span className="bolt-mark" aria-hidden="true">↯</span>; }
function Brand() {
  const name = useContent("global.brand.name", "");
  const logo = useContent("global.brand.logoUrl", "");
  return <a className="brand" href={siteHref("/")}>{logo ? <img src={logo} alt={name} /> : <><Bolt/><span>{name}</span></>}</a>;
}
function Header() {
  const phone = useContent("global.contact.phone", "");
  const area = useContent("global.contact.serviceArea", "");
  const tel = useTelHref();
  const wa = useWhatsAppUrl();
  const labels = { services:useContent("global.nav.servicesLabel",""), about:useContent("global.nav.aboutLabel",""), projects:useContent("global.nav.projectsLabel",""), blog:useContent("global.nav.blogLabel",""), contact:useContent("global.nav.contactLabel",""), cta:useContent("global.cta.headerLabel","") };
  const links = [["/servicos",labels.services],["/sobre",labels.about],["/#projetos",labels.projects],["/blog",labels.blog],["/contato",labels.contact]];
  return <><div className="topbar"><div className="container topbar-inner"><span>{area}</span><a href={tel}>{phone}</a></div></div><header className="header"><div className="container header-inner"><Brand/><nav className="desktop-nav">{links.map(([href,label])=><a key={href} href={siteHref(href)}>{label}</a>)}</nav><a className="btn btn-small btn-primary header-cta" href={wa} target="_blank" rel="noopener">{labels.cta}</a><details className="mobile-menu"><summary aria-label="Abrir menu"><span/><span/><span/></summary><div className="mobile-panel">{links.map(([href,label])=><a key={href} href={siteHref(href)}>{label}</a>)}<a className="btn btn-primary" href={wa} target="_blank" rel="noopener">{labels.cta}</a></div></details></div></header></>;
}
function Footer() {
  const tagline=useContent("global.footer.tagline",""); const copyright=useContent("global.footer.copyright",""); const email=useContent("global.contact.email",""); const phone=useContent("global.contact.phone",""); const tel=useTelHref();
  const instagram=useContent("global.social.instagram",""); const facebook=useContent("global.social.facebook",""); const linkedin=useContent("global.social.linkedin","");
  return <footer className="footer"><div className="container footer-grid"><div><Brand/><p>{tagline}</p></div><div className="footer-links"><a href={siteHref("/servicos")}>{useContent("global.nav.servicesLabel","")}</a><a href={siteHref("/sobre")}>{useContent("global.nav.aboutLabel","")}</a><a href={siteHref("/blog")}>{useContent("global.nav.blogLabel","")}</a><a href={siteHref("/contato")}>{useContent("global.nav.contactLabel","")}</a></div><div className="footer-contact"><a href={tel}>{phone}</a><a href={`mailto:${email}`}>{email}</a><div className="socials">{instagram&&<a href={instagram} target="_blank" rel="noopener">Instagram</a>}{facebook&&<a href={facebook} target="_blank" rel="noopener">Facebook</a>}{linkedin&&<a href={linkedin} target="_blank" rel="noopener">LinkedIn</a>}</div></div></div><div className="container footer-bottom">{copyright}</div></footer>;
}
function FloatingWhatsapp() { const wa=useWhatsAppUrl(); return <div className="floating"><div className="floating-copy"><strong>{useContent("global.cta.floatingTitle","")}</strong><span>{useContent("global.cta.floatingText","")}</span></div><a href={wa} target="_blank" rel="noopener" aria-label={useContent("global.cta.floatingButtonLabel","")}>✆</a></div>; }
function Layout({children,post}) { return <><SeoManager post={post}/><Header/><main>{children}</main><Footer/><FloatingWhatsapp/></>; }
function Eyebrow({children}) { return <span className="eyebrow">{children}</span>; }
function SectionTitle({eyebrow,title,description}) { return <div className="section-title"><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}</div>; }
function Stats() { return <div className="stats-strip">{useCollection("collections.stats").map(item=><div key={item.id}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>; }
function ServiceCard({service,index}) {
  const number=useContent("global.contact.whatsappRaw",""); const wa=buildWhatsAppHref(number,service.whatsappMessage||useContent("global.contact.whatsappMessage",""));
  return <article className="service-card"><div className="service-top"><span className="service-icon">{service.icon}</span><span className="service-index">0{index+1}</span></div><span className="service-highlight">{service.highlight}</span><h3>{service.title}</h3><p>{service.description}</p><a href={wa} target="_blank" rel="noopener">{service.ctaLabel}<span>→</span></a></article>;
}
function Benefits() { return <div className="benefit-grid">{useCollection("collections.benefits").map(item=><article key={item.id}><span>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>; }
function Projects() { return <div className="project-grid">{useCollection("collections.projects").map((item,index)=><article className={index===0?"project-card project-wide":"project-card"} key={item.id}><img src={item.image} alt={item.imageAlt||item.title}/><div><span>{item.category}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>; }
function Reviews() { return <div className="review-grid">{useCollection("collections.reviews").map(item=><article key={item.id}><div className="stars">★★★★★ <span>{item.rating}</span></div><blockquote>{item.quote}</blockquote><div><strong>{item.name}</strong><span>{item.role}</span></div></article>)}</div>; }
function Faq() { return <div className="faq-list">{useCollection("collections.faq").map(item=><details key={item.id}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>; }
function PageHero({page}) { return <section className="page-hero"><div className="container"><Eyebrow>{useContent(`pages.${page}.hero.eyebrow`,"")}</Eyebrow><h1>{useContent(`pages.${page}.hero.title`,"")}</h1><p>{useContent(`pages.${page}.hero.description`,"")}</p></div></section>; }
function HomePage() {
  const wa=useWhatsAppUrl(); const services=useCollection("collections.services"); const emergencyWa=useWhatsAppUrl(useContent("pages.home.emergency.whatsappMessage",""));
  return <Layout><section className="hero"><div className="container hero-grid"><div className="hero-copy"><Eyebrow>{useContent("pages.home.hero.eyebrow","")}</Eyebrow><h1>{useContent("pages.home.hero.title","")} <span>{useContent("pages.home.hero.titleAccent","")}</span></h1><p>{useContent("pages.home.hero.description","")}</p><div className="hero-actions"><a className="btn btn-primary" href={wa} target="_blank" rel="noopener">{useContent("pages.home.hero.primaryCtaLabel","")}<span>↗</span></a><a className="btn btn-ghost" href={siteHref("/servicos")}>{useContent("pages.home.hero.secondaryCtaLabel","")}</a></div><Stats/></div><div className="hero-visual"><div className="hero-image-shell"><img src={useContent("pages.home.hero.image","")} alt={useContent("pages.home.hero.imageAlt","")}/></div><div className="quick-card"><span className="quick-badge">{useContent("pages.home.hero.quickBadge","")}</span><strong>{useContent("pages.home.hero.quickTitle","")}</strong><p>{useContent("pages.home.hero.quickText","")}</p><a href={wa} target="_blank" rel="noopener">{useContent("global.cta.headerLabel","")} <span>→</span></a></div></div></div></section><section className="section services-section"><div className="container"><SectionTitle eyebrow={useContent("pages.home.services.eyebrow","")} title={useContent("pages.home.services.title","")} description={useContent("pages.home.services.description","")}/><div className="services-grid">{services.map((service,index)=><ServiceCard key={service.id} service={service} index={index}/>)}</div><div className="center-action"><a className="btn btn-dark" href={siteHref("/servicos")}>{useContent("pages.home.services.ctaLabel","")}</a></div></div></section><section className="section soft-section"><div className="container"><Benefits/></div></section><section className="section projects-section" id="projetos"><div className="container"><SectionTitle eyebrow={useContent("pages.home.projects.eyebrow","")} title={useContent("pages.home.projects.title","")} description={useContent("pages.home.projects.description","")}/><Projects/></div></section><section className="section reviews-section"><div className="container"><SectionTitle eyebrow={useContent("pages.home.reviews.eyebrow","")} title={useContent("pages.home.reviews.title","")} description={useContent("pages.home.reviews.description","")}/><Reviews/></div></section><section className="section emergency-wrap"><div className="container"><div className="emergency"><div><Eyebrow>{useContent("pages.home.emergency.eyebrow","")}</Eyebrow><h2>{useContent("pages.home.emergency.title","")}</h2><p>{useContent("pages.home.emergency.description","")}</p></div><a className="btn btn-white" href={emergencyWa} target="_blank" rel="noopener">{useContent("pages.home.emergency.ctaLabel","")}</a></div></div></section></Layout>;
}
function ServicesPage() { const services=useCollection("collections.services"),process=useCollection("collections.process"); return <Layout><PageHero page="services"/><section className="section"><div className="container"><SectionTitle eyebrow={useContent("pages.services.hero.eyebrow","")} title={useContent("pages.services.intro.title","")} description={useContent("pages.services.intro.description","")}/><div className="services-grid">{services.map((service,index)=><ServiceCard key={service.id} service={service} index={index}/>)}</div></div></section><section className="section process-section"><div className="container"><SectionTitle eyebrow={useContent("pages.services.process.eyebrow","")} title={useContent("pages.services.process.title","")}/><div className="process-grid">{process.map(item=><article key={item.id}><span>{item.step}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section><section className="section"><div className="container"><Faq/></div></section></Layout>; }
function AboutPage() { const values=useCollection("collections.values"),areas=useCollection("collections.serviceAreas"),wa=useWhatsAppUrl(); return <Layout><PageHero page="about"/><section className="section about-story"><div className="container about-grid"><div><SectionTitle eyebrow={useContent("pages.about.hero.eyebrow","")} title={useContent("pages.about.story.title","")}/><p>{useContent("pages.about.story.paragraph1","")}</p><p>{useContent("pages.about.story.paragraph2","")}</p><a className="btn btn-primary" href={wa} target="_blank" rel="noopener">{useContent("global.cta.headerLabel","")}</a></div><div className="about-panel"><Bolt/><strong>{useContent("global.brand.name","")}</strong><p>{useContent("global.brand.description","")}</p><div className="area-tags">{areas.map(area=><span key={area.id}>{area.name}</span>)}</div></div></div></section><section className="section values-section"><div className="container"><SectionTitle eyebrow={useContent("pages.about.values.eyebrow","")} title={useContent("pages.about.values.title","")}/><div className="values-grid">{values.map(item=><article key={item.id}><span>{item.icon}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section></Layout>; }
function ContactPage() {
  const waNumber=useContent("global.contact.whatsappRaw",""); const phone=useContent("global.contact.phone",""); const email=useContent("global.contact.email",""); const address=useContent("global.contact.address",""); const area=useContent("global.contact.serviceArea",""); const hours=useContent("global.contact.businessHoursWeek",""); const tel=useTelHref(); const enabled=Boolean(useContent("pages.contact.form.enabled",true)); const formWhatsappMessage=useContent("pages.contact.form.whatsappMessage","");
  function submit(event) { event.preventDefault(); const data=new FormData(event.currentTarget); const lines=[formWhatsappMessage,`Nome: ${data.get("name")||""}`,`Telefone: ${data.get("phone")||""}`,`Serviço: ${data.get("service")||""}`,`Detalhes: ${data.get("message")||""}`]; window.open(buildWhatsAppHref(waNumber,lines.join("\n")),"_blank","noopener,noreferrer"); }
  const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return <Layout><PageHero page="contact"/><section className="section contact-section"><div className="container contact-grid"><div className="contact-info"><div className="contact-card"><span>01</span><div><strong>{phone}</strong><a href={tel}>{phone}</a></div></div><div className="contact-card"><span>02</span><div><strong>{email}</strong><a href={`mailto:${email}`}>{email}</a></div></div><div className="contact-card"><span>03</span><div><strong>{area}</strong><p>{hours}</p></div></div><div className="map-card"><div><Eyebrow>{useContent("pages.contact.map.title","")}</Eyebrow><h3>{address}</h3><p>{useContent("pages.contact.map.description","")}</p><a href={mapUrl} target="_blank" rel="noopener">{useContent("pages.contact.map.buttonLabel","")} ↗</a></div><div className="map-pattern"><span/><span/><span/></div></div></div>{enabled&&<form className="quote-form" onSubmit={submit}><div><Eyebrow>{useContent("pages.contact.form.title","")}</Eyebrow><h2>{useContent("pages.contact.form.title","")}</h2><p>{useContent("pages.contact.form.description","")}</p></div><label>{useContent("pages.contact.form.nameLabel","")}<input name="name" required placeholder={useContent("pages.contact.form.namePlaceholder","")}/></label><label>{useContent("pages.contact.form.phoneLabel","")}<input name="phone" required placeholder={useContent("pages.contact.form.phonePlaceholder","")}/></label><label>{useContent("pages.contact.form.serviceLabel","")}<input name="service" required placeholder={useContent("pages.contact.form.servicePlaceholder","")}/></label><label>{useContent("pages.contact.form.messageLabel","")}<textarea name="message" rows="5" placeholder={useContent("pages.contact.form.messagePlaceholder","")}/></label><button className="btn btn-primary" type="submit">{useContent("pages.contact.form.submitText","")}</button></form>}</div></section></Layout>;
}
function formatDate(value) { if(!value)return""; try{return new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(value));}catch{return"";} }
function BlogPage() { const[posts,setPosts]=useState([]),[loading,setLoading]=useState(true); useEffect(()=>{let active=true; void fetchCorujaBlogPosts().then(data=>{if(active){setPosts(data);setLoading(false);}}); return()=>{active=false;};},[]); return <Layout><section className="page-hero blog-hero"><div className="container"><Eyebrow>{useContent("pages.blog.eyebrow","")}</Eyebrow><h1>{useContent("pages.blog.title","")}</h1><p>{useContent("pages.blog.description","")}</p></div></section><section className="section"><div className="container">{loading?<div className="blog-empty"><div className="runtime-loader"/></div>:posts.length?<div className="blog-grid">{posts.map(post=><article key={post.slug}><a className="blog-image" href={siteHref(`/blog/${post.slug}`)}>{post.coverImage?<img src={post.coverImage} alt={post.coverImageAlt}/>:<div><Bolt/></div>}</a><div className="blog-body"><span>{post.category||formatDate(post.publishedAt)}</span><h2><a href={siteHref(`/blog/${post.slug}`)}>{post.title}</a></h2><p>{post.excerpt}</p><a href={siteHref(`/blog/${post.slug}`)}>{useContent("pages.blog.readLabel","")} →</a></div></article>)}</div>:<div className="blog-empty"><Bolt/><p>{useContent("pages.blog.emptyMessage","")}</p></div>}</div></section></Layout>; }
function BlogPostPage() { const slug=currentSlug(); const[post,setPost]=useState(null),[loading,setLoading]=useState(true); useEffect(()=>{let active=true; void fetchCorujaBlogPost(slug).then(data=>{if(active){setPost(data);setLoading(false);}}); return()=>{active=false;};},[slug]); if(loading)return <Layout><div className="post-state"><div className="runtime-loader"/></div></Layout>; if(!post)return <NotFound/>; const html=post.contentHtml||(Array.isArray(post.content)?post.content.map(p=>`<p>${p}</p>`).join(""):String(post.content||"")); return <Layout post={post}><article className="post"><div className="container post-head"><a href={siteHref("/blog")}>← {useContent("pages.blog.backLabel","")}</a><span>{post.category||formatDate(post.publishedAt)}</span><h1>{post.title}</h1><p>{post.excerpt}</p>{post.coverImage&&<img src={post.coverImage} alt={post.coverImageAlt}/>}</div><div className="container post-content" dangerouslySetInnerHTML={{__html:html}}/></article></Layout>; }
function NotFound() { const wa=useWhatsAppUrl(),brand=useContent("global.brand.name",""); return <Layout><section className="not-found"><div><Bolt/><h1>404</h1><a className="btn btn-primary" href={siteHref("/")}>{brand}</a><a className="text-link" href={wa} target="_blank" rel="noopener">{useContent("global.cta.headerLabel","")}</a></div></section></Layout>; }
function RouterView() { const route=currentRoute(); const blogEnabled=Boolean(useContent("blog.enabled",true)); if(route==="/")return <HomePage/>; if(route==="/servicos")return <ServicesPage/>; if(route==="/sobre")return <AboutPage/>; if(route==="/contato")return <ContactPage/>; if(route==="/blog"&&blogEnabled)return <BlogPage/>; if(route.startsWith("/blog/")&&blogEnabled)return <BlogPostPage/>; return <NotFound/>; }
export default function App() { return <CorujaProvider><CorujaContentGate><RouterView/></CorujaContentGate></CorujaProvider>; }
