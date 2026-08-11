import { useEffect, useState } from "react";
import {
  CorujaContentGate,
  CorujaProvider,
  buildWhatsAppHref,
  useCollection,
  useContent,
  useTelHref,
  useWhatsAppUrl,
} from "./coruja-template/content.jsx";
import {
  fetchCorujaBlogPost,
  fetchCorujaBlogPosts,
} from "./coruja-template/api.js";

const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function editable(path, type = "text", extra = {}) {
  return { "data-coruja-path": path, "data-coruja-type": type, ...extra };
}

function editableButton(path, label, extra = {}) {
  return editable(path, "button", {
    "data-coruja-text-path": path,
    "data-coruja-label": label,
    ...extra,
  });
}

function editableImage(path, altPath, label) {
  return editable(path, "image", {
    "data-coruja-src-path": path,
    "data-coruja-alt-path": altPath,
    "data-coruja-label": label,
  });
}

function collectionPath(collection, index, field) {
  return `collections.${collection}.${index}.${field}`;
}

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
  if (base && pathname.startsWith(base))
    pathname = pathname.slice(base.length) || "/";
  return pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
}
function currentSlug() {
  const match = currentRoute().match(/^\/blog\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}
function setMeta(name, content, attr = "name") {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}
function setLink(rel, href) {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}
function SeoManager({ post }) {
  const route = currentRoute();
  const pageId =
    route === "/servicos"
      ? "services"
      : route === "/sobre"
        ? "about"
        : route === "/contato"
          ? "contact"
          : route.startsWith("/blog")
            ? "blog"
            : "home";
  const globalTitle = useContent("global.seo.title", "");
  const globalDescription = useContent("global.seo.description", "");
  const pageTitle = useContent(`pages.${pageId}.seo.title`, globalTitle);
  const pageDescription = useContent(
    `pages.${pageId}.seo.description`,
    globalDescription,
  );
  const pageImage = useContent(
    `pages.${pageId}.seo.ogImage`,
    useContent("global.seo.ogImage", ""),
  );
  const canonicalBase = useContent("global.seo.canonicalBase", "");
  const favicon = useContent("global.brand.faviconUrl", "/favicon.svg");
  const brand = useContent("global.brand.name", "");
  const phone = useContent("global.contact.phoneRaw", "");
  const address = useContent("global.contact.address", "");
  const serviceArea = useContent("global.contact.serviceArea", "");
  useEffect(() => {
    const title = post?.seoTitle || post?.title || pageTitle || globalTitle;
    const description =
      post?.seoDescription ||
      post?.excerpt ||
      pageDescription ||
      globalDescription;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", post ? "article" : "website", "property");
    if (pageImage) setMeta("og:image", pageImage, "property");
    setLink("icon", favicon);
    const suffix = post ? `/blog/${post.slug}` : route;
    if (canonicalBase)
      setLink(
        "canonical",
        `${canonicalBase.replace(/\/+$/, "")}${suffix === "/" ? "" : suffix}`,
      );
    const id = "coruja-electrician-schema";
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Electrician",
      name: brand,
      telephone: phone,
      address,
      areaServed: serviceArea,
      url: canonicalBase || undefined,
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [
    post,
    pageTitle,
    pageDescription,
    pageImage,
    globalTitle,
    globalDescription,
    canonicalBase,
    favicon,
    brand,
    phone,
    address,
    serviceArea,
    route,
  ]);
  return null;
}
function Bolt() {
  return (
    <span className="bolt-mark" aria-hidden="true">
      ↯
    </span>
  );
}
function Brand() {
  const name = useContent("global.brand.name", "");
  const logo = useContent("global.brand.logoUrl", "");
  return (
    <a className="brand" href={siteHref("/")} aria-label={name}>
      {logo ? (
        <img
          src={logo}
          alt={name}
          {...editableImage(
            "global.brand.logoUrl",
            "global.brand.name",
            "Logo da empresa",
          )}
        />
      ) : (
        <>
          <Bolt />
          <span {...editable("global.brand.name")}>{name}</span>
        </>
      )}
    </a>
  );
}
function Header() {
  const phone = useContent("global.contact.phone", "");
  const area = useContent("global.contact.serviceArea", "");
  const tel = useTelHref();
  const wa = useWhatsAppUrl();
  const links = [
    [
      "/servicos",
      useContent("global.nav.servicesLabel", ""),
      "global.nav.servicesLabel",
    ],
    [
      "/sobre",
      useContent("global.nav.aboutLabel", ""),
      "global.nav.aboutLabel",
    ],
    [
      "/#projetos",
      useContent("global.nav.projectsLabel", ""),
      "global.nav.projectsLabel",
    ],
    ["/blog", useContent("global.nav.blogLabel", ""), "global.nav.blogLabel"],
    [
      "/contato",
      useContent("global.nav.contactLabel", ""),
      "global.nav.contactLabel",
    ],
  ];
  const cta = useContent("global.cta.headerLabel", "");
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span {...editable("global.contact.serviceArea")}>{area}</span>
          <a
            href={tel}
            data-coruja-event="tel_click"
            data-coruja-event-label="header_phone"
            {...editable("global.contact.phone")}
          >
            {phone}
          </a>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav">
            {links.map(([href, label, path]) => (
              <a key={href} href={siteHref(href)} {...editable(path)}>
                {label}
              </a>
            ))}
          </nav>
          <a
            className="btn btn-small btn-primary header-cta"
            href={wa}
            target="_blank"
            rel="noopener"
            data-coruja-event="whatsapp_click"
            data-coruja-event-label="header_whatsapp"
            {...editableButton("global.cta.headerLabel", "Botão do cabeçalho")}
          >
            {cta}
          </a>
          <details className="mobile-menu">
            <summary aria-label="Abrir menu">
              <span />
              <span />
              <span />
            </summary>
            <div className="mobile-panel">
              {links.map(([href, label, path]) => (
                <a key={href} href={siteHref(href)} {...editable(path)}>
                  {label}
                </a>
              ))}
              <a
                className="btn btn-primary"
                href={wa}
                target="_blank"
                rel="noopener"
                data-coruja-event="whatsapp_click"
                data-coruja-event-label="mobile_menu_whatsapp"
                {...editableButton(
                  "global.cta.headerLabel",
                  "Botão do menu móvel",
                )}
              >
                {cta}
              </a>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}
function Footer() {
  const tagline = useContent("global.footer.tagline", "");
  const copyright = useContent("global.footer.copyright", "");
  const email = useContent("global.contact.email", "");
  const phone = useContent("global.contact.phone", "");
  const tel = useTelHref();
  const instagram = useContent("global.social.instagram", "");
  const facebook = useContent("global.social.facebook", "");
  const linkedin = useContent("global.social.linkedin", "");
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p {...editable("global.footer.tagline")}>{tagline}</p>
        </div>
        <div className="footer-links">
          <a
            href={siteHref("/servicos")}
            {...editable("global.nav.servicesLabel")}
          >
            {useContent("global.nav.servicesLabel", "")}
          </a>
          <a href={siteHref("/sobre")} {...editable("global.nav.aboutLabel")}>
            {useContent("global.nav.aboutLabel", "")}
          </a>
          <a href={siteHref("/blog")} {...editable("global.nav.blogLabel")}>
            {useContent("global.nav.blogLabel", "")}
          </a>
          <a
            href={siteHref("/contato")}
            {...editable("global.nav.contactLabel")}
          >
            {useContent("global.nav.contactLabel", "")}
          </a>
        </div>
        <div className="footer-contact">
          <a
            href={tel}
            data-coruja-event="tel_click"
            data-coruja-event-label="footer_phone"
            {...editable("global.contact.phone")}
          >
            {phone}
          </a>
          <a href={`mailto:${email}`} {...editable("global.contact.email")}>
            {email}
          </a>
          <div className="socials">
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener"
                data-coruja-url-path="global.social.instagram"
                {...editable("global.social.instagram", "url")}
              >
                Instagram
              </a>
            )}
            {facebook && (
              <a
                href={facebook}
                target="_blank"
                rel="noopener"
                data-coruja-url-path="global.social.facebook"
                {...editable("global.social.facebook", "url")}
              >
                Facebook
              </a>
            )}
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener"
                data-coruja-url-path="global.social.linkedin"
                {...editable("global.social.linkedin", "url")}
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
      <div
        className="container footer-bottom"
        {...editable("global.footer.copyright")}
      >
        {copyright}
      </div>
    </footer>
  );
}
function FloatingWhatsapp() {
  const wa = useWhatsAppUrl();
  const label = useContent("global.cta.floatingButtonLabel", "");
  return (
    <div className="floating">
      <div className="floating-copy">
        <strong {...editable("global.cta.floatingTitle")}>
          {useContent("global.cta.floatingTitle", "")}
        </strong>
        <span {...editable("global.cta.floatingText")}>
          {useContent("global.cta.floatingText", "")}
        </span>
      </div>
      <a
        href={wa}
        target="_blank"
        rel="noopener"
        aria-label={label}
        data-coruja-event="whatsapp_click"
        data-coruja-event-label="floating_whatsapp"
        data-coruja-value={label}
        {...editable("global.cta.floatingButtonLabel")}
      >
        ✆
      </a>
    </div>
  );
}
function ContractBridge() {
  const values = useCollection("collections.values");
  const process = useCollection("collections.process");
  const areas = useCollection("collections.serviceAreas");
  const faq = useCollection("collections.faq");
  const logoIcon = useContent("global.brand.logoIconUrl", "");
  if (currentRoute() !== "/") return null;
  return (
    <div style={visuallyHidden} aria-hidden="true">
      <span {...editable("global.brand.legalName")}>
        {useContent("global.brand.legalName", "")}
      </span>
      <span {...editable("global.brand.description")}>
        {useContent("global.brand.description", "")}
      </span>
      {logoIcon && (
        <img
          src={logoIcon}
          alt=""
          {...editableImage(
            "global.brand.logoIconUrl",
            "global.brand.name",
            "Ícone da marca",
          )}
        />
      )}
      {values.slice(0, 1).map((item, index) => (
        <span key={item.id}>
          <span {...editable(collectionPath("values", index, "icon"))}>
            {item.icon}
          </span>
          <span {...editable(collectionPath("values", index, "title"))}>
            {item.title}
          </span>
          <span {...editable(collectionPath("values", index, "description"))}>
            {item.description}
          </span>
        </span>
      ))}
      {process.slice(0, 1).map((item, index) => (
        <span key={item.id}>
          <span {...editable(collectionPath("process", index, "step"))}>
            {item.step}
          </span>
          <span {...editable(collectionPath("process", index, "title"))}>
            {item.title}
          </span>
          <span {...editable(collectionPath("process", index, "description"))}>
            {item.description}
          </span>
        </span>
      ))}
      {areas.slice(0, 1).map((item, index) => (
        <span
          key={item.id}
          {...editable(collectionPath("serviceAreas", index, "name"))}
        >
          {item.name}
        </span>
      ))}
      {faq.slice(0, 1).map((item, index) => (
        <span key={item.id}>
          <span {...editable(collectionPath("faq", index, "question"))}>
            {item.question}
          </span>
          <span {...editable(collectionPath("faq", index, "answer"))}>
            {item.answer}
          </span>
        </span>
      ))}
    </div>
  );
}
function Layout({ children, post }) {
  return (
    <>
      <SeoManager post={post} />
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingWhatsapp />
      <ContractBridge />
    </>
  );
}
function Eyebrow({ children, path }) {
  return (
    <span className="eyebrow" {...(path ? editable(path) : {})}>
      {children}
    </span>
  );
}
function SectionTitle({
  eyebrow,
  title,
  description,
  eyebrowPath,
  titlePath,
  descriptionPath,
}) {
  return (
    <div className="section-title">
      <Eyebrow path={eyebrowPath}>{eyebrow}</Eyebrow>
      <h2 {...(titlePath ? editable(titlePath) : {})}>{title}</h2>
      {description && (
        <p {...(descriptionPath ? editable(descriptionPath) : {})}>
          {description}
        </p>
      )}
    </div>
  );
}
function Stats() {
  return (
    <div className="stats-strip" data-coruja-collection="stats">
      {useCollection("collections.stats").map((item, index) => (
        <div key={item.id} data-coruja-item-id={item.id}>
          <strong {...editable(collectionPath("stats", index, "value"))}>
            {item.value}
          </strong>
          <span {...editable(collectionPath("stats", index, "label"))}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
function ServiceCard({ service, index }) {
  const number = useContent("global.contact.whatsappRaw", "");
  const message =
    service.whatsappMessage || useContent("global.contact.whatsappMessage", "");
  const wa = buildWhatsAppHref(number, message);
  return (
    <article
      className="service-card"
      data-coruja-collection="services"
      data-coruja-item-id={service.id}
    >
      <div className="service-top">
        <span
          className="service-icon"
          {...editable(collectionPath("services", index, "icon"))}
        >
          {service.icon}
        </span>
        <span className="service-index">0{index + 1}</span>
      </div>
      <span
        className="service-highlight"
        {...editable(collectionPath("services", index, "highlight"))}
      >
        {service.highlight}
      </span>
      <h3 {...editable(collectionPath("services", index, "title"))}>
        {service.title}
      </h3>
      <p {...editable(collectionPath("services", index, "description"))}>
        {service.description}
      </p>
      <a
        href={wa}
        target="_blank"
        rel="noopener"
        data-coruja-url-path={collectionPath(
          "services",
          index,
          "whatsappMessage",
        )}
        data-coruja-event="whatsapp_click"
        data-coruja-event-label={`service_card_${index + 1}_whatsapp`}
        {...editableButton(
          collectionPath("services", index, "ctaLabel"),
          `Botão do serviço ${index + 1}`,
        )}
      >
        {service.ctaLabel}
        <span>→</span>
      </a>
    </article>
  );
}
function Benefits() {
  return (
    <div className="benefit-grid" data-coruja-collection="benefits">
      {useCollection("collections.benefits").map((item, index) => (
        <article key={item.id} data-coruja-item-id={item.id}>
          <span {...editable(collectionPath("benefits", index, "icon"))}>
            {item.icon}
          </span>
          <div>
            <h3 {...editable(collectionPath("benefits", index, "title"))}>
              {item.title}
            </h3>
            <p {...editable(collectionPath("benefits", index, "description"))}>
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
function Projects() {
  return (
    <div className="project-grid" data-coruja-collection="projects">
      {useCollection("collections.projects").map((item, index) => (
        <article
          className={index === 0 ? "project-card project-wide" : "project-card"}
          key={item.id}
          data-coruja-item-id={item.id}
        >
          <img
            src={item.image}
            alt={item.imageAlt || item.title}
            {...editableImage(
              collectionPath("projects", index, "image"),
              collectionPath("projects", index, "imageAlt"),
              `Imagem do projeto ${index + 1}`,
            )}
          />
          <div>
            <span {...editable(collectionPath("projects", index, "category"))}>
              {item.category}
            </span>
            <h3 {...editable(collectionPath("projects", index, "title"))}>
              {item.title}
            </h3>
            <p {...editable(collectionPath("projects", index, "description"))}>
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
function Reviews() {
  return (
    <div className="review-grid" data-coruja-collection="reviews">
      {useCollection("collections.reviews").map((item, index) => (
        <article key={item.id} data-coruja-item-id={item.id}>
          <div className="stars">
            ★★★★★{" "}
            <span {...editable(collectionPath("reviews", index, "rating"))}>
              {item.rating}
            </span>
          </div>
          <blockquote {...editable(collectionPath("reviews", index, "quote"))}>
            {item.quote}
          </blockquote>
          <div>
            <strong {...editable(collectionPath("reviews", index, "name"))}>
              {item.name}
            </strong>
            <span {...editable(collectionPath("reviews", index, "role"))}>
              {item.role}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
function Faq() {
  return (
    <div className="faq-list" data-coruja-collection="faq">
      {useCollection("collections.faq").map((item, index) => (
        <details key={item.id} data-coruja-item-id={item.id}>
          <summary>
            <span {...editable(collectionPath("faq", index, "question"))}>
              {item.question}
            </span>
            <span>+</span>
          </summary>
          <p {...editable(collectionPath("faq", index, "answer"))}>
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
function PageHero({ page }) {
  const base = `pages.${page}.hero`;
  return (
    <section className="page-hero">
      <div className="container">
        <Eyebrow path={`${base}.eyebrow`}>
          {useContent(`${base}.eyebrow`, "")}
        </Eyebrow>
        <h1 {...editable(`${base}.title`)}>
          {useContent(`${base}.title`, "")}
        </h1>
        <p {...editable(`${base}.description`)}>
          {useContent(`${base}.description`, "")}
        </p>
      </div>
    </section>
  );
}
function HomePage() {
  const wa = useWhatsAppUrl();
  const services = useCollection("collections.services");
  const emergencyMessage = useContent(
    "pages.home.emergency.whatsappMessage",
    "",
  );
  const emergencyWa = useWhatsAppUrl(emergencyMessage);
  const image = useContent("pages.home.hero.image", "");
  const imageAlt = useContent("pages.home.hero.imageAlt", "");
  return (
    <Layout>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Eyebrow path="pages.home.hero.eyebrow">
              {useContent("pages.home.hero.eyebrow", "")}
            </Eyebrow>
            <h1>
              <span {...editable("pages.home.hero.title")}>
                {useContent("pages.home.hero.title", "")}
              </span>{" "}
              <span {...editable("pages.home.hero.titleAccent")}>
                {useContent("pages.home.hero.titleAccent", "")}
              </span>
            </h1>
            <p {...editable("pages.home.hero.description")}>
              {useContent("pages.home.hero.description", "")}
            </p>
            <div className="hero-actions">
              <a
                className="btn btn-primary"
                href={wa}
                target="_blank"
                rel="noopener"
                data-coruja-event="whatsapp_click"
                data-coruja-event-label="hero_whatsapp"
                {...editableButton(
                  "pages.home.hero.primaryCtaLabel",
                  "Botão principal da capa",
                )}
              >
                {useContent("pages.home.hero.primaryCtaLabel", "")}
                <span>↗</span>
              </a>
              <a
                className="btn btn-ghost"
                href={siteHref("/servicos")}
                {...editableButton(
                  "pages.home.hero.secondaryCtaLabel",
                  "Botão secundário da capa",
                )}
              >
                {useContent("pages.home.hero.secondaryCtaLabel", "")}
              </a>
            </div>
            <Stats />
          </div>
          <div className="hero-visual">
            <div className="hero-image-shell">
              <img
                src={image}
                alt={imageAlt}
                {...editableImage(
                  "pages.home.hero.image",
                  "pages.home.hero.imageAlt",
                  "Imagem principal",
                )}
              />
            </div>
            <div className="quick-card">
              <span
                className="quick-badge"
                {...editable("pages.home.hero.quickBadge")}
              >
                {useContent("pages.home.hero.quickBadge", "")}
              </span>
              <strong {...editable("pages.home.hero.quickTitle")}>
                {useContent("pages.home.hero.quickTitle", "")}
              </strong>
              <p {...editable("pages.home.hero.quickText")}>
                {useContent("pages.home.hero.quickText", "")}
              </p>
              <a
                href={wa}
                target="_blank"
                rel="noopener"
                data-coruja-event="whatsapp_click"
                data-coruja-event-label="quick_card_whatsapp"
                {...editableButton(
                  "global.cta.headerLabel",
                  "Botão do card rápido",
                )}
              >
                {useContent("global.cta.headerLabel", "")} <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="section services-section">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.home.services.eyebrow", "")}
            title={useContent("pages.home.services.title", "")}
            description={useContent("pages.home.services.description", "")}
            eyebrowPath="pages.home.services.eyebrow"
            titlePath="pages.home.services.title"
            descriptionPath="pages.home.services.description"
          />
          <div className="services-grid">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </div>
          <div className="center-action">
            <a
              className="btn btn-dark"
              href={siteHref("/servicos")}
              {...editableButton(
                "pages.home.services.ctaLabel",
                "Botão dos serviços",
              )}
            >
              {useContent("pages.home.services.ctaLabel", "")}
            </a>
          </div>
        </div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <Benefits />
        </div>
      </section>
      <section className="section projects-section" id="projetos">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.home.projects.eyebrow", "")}
            title={useContent("pages.home.projects.title", "")}
            description={useContent("pages.home.projects.description", "")}
            eyebrowPath="pages.home.projects.eyebrow"
            titlePath="pages.home.projects.title"
            descriptionPath="pages.home.projects.description"
          />
          <Projects />
        </div>
      </section>
      <section className="section reviews-section">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.home.reviews.eyebrow", "")}
            title={useContent("pages.home.reviews.title", "")}
            description={useContent("pages.home.reviews.description", "")}
            eyebrowPath="pages.home.reviews.eyebrow"
            titlePath="pages.home.reviews.title"
            descriptionPath="pages.home.reviews.description"
          />
          <Reviews />
        </div>
      </section>
      <section className="section emergency-wrap">
        <div className="container">
          <div className="emergency">
            <div>
              <Eyebrow path="pages.home.emergency.eyebrow">
                {useContent("pages.home.emergency.eyebrow", "")}
              </Eyebrow>
              <h2 {...editable("pages.home.emergency.title")}>
                {useContent("pages.home.emergency.title", "")}
              </h2>
              <p {...editable("pages.home.emergency.description")}>
                {useContent("pages.home.emergency.description", "")}
              </p>
            </div>
            <a
              className="btn btn-white"
              href={emergencyWa}
              target="_blank"
              rel="noopener"
              data-coruja-url-path="pages.home.emergency.whatsappMessage"
              data-coruja-event="whatsapp_click"
              data-coruja-event-label="emergency_whatsapp"
              {...editableButton(
                "pages.home.emergency.ctaLabel",
                "Botão de emergência",
              )}
            >
              {useContent("pages.home.emergency.ctaLabel", "")}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
function ServicesPage() {
  const services = useCollection("collections.services"),
    process = useCollection("collections.process");
  return (
    <Layout>
      <PageHero page="services" />
      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.services.hero.eyebrow", "")}
            title={useContent("pages.services.intro.title", "")}
            description={useContent("pages.services.intro.description", "")}
            eyebrowPath="pages.services.hero.eyebrow"
            titlePath="pages.services.intro.title"
            descriptionPath="pages.services.intro.description"
          />
          <div className="services-grid">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </div>
        </div>
      </section>
      <section className="section process-section">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.services.process.eyebrow", "")}
            title={useContent("pages.services.process.title", "")}
            eyebrowPath="pages.services.process.eyebrow"
            titlePath="pages.services.process.title"
          />
          <div className="process-grid" data-coruja-collection="process">
            {process.map((item, index) => (
              <article key={item.id} data-coruja-item-id={item.id}>
                <span {...editable(collectionPath("process", index, "step"))}>
                  {item.step}
                </span>
                <h3 {...editable(collectionPath("process", index, "title"))}>
                  {item.title}
                </h3>
                <p
                  {...editable(collectionPath("process", index, "description"))}
                >
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Faq />
        </div>
      </section>
    </Layout>
  );
}
function AboutPage() {
  const values = useCollection("collections.values"),
    areas = useCollection("collections.serviceAreas"),
    wa = useWhatsAppUrl();
  return (
    <Layout>
      <PageHero page="about" />
      <section className="section about-story">
        <div className="container about-grid">
          <div>
            <SectionTitle
              eyebrow={useContent("pages.about.hero.eyebrow", "")}
              title={useContent("pages.about.story.title", "")}
              eyebrowPath="pages.about.hero.eyebrow"
              titlePath="pages.about.story.title"
            />
            <p {...editable("pages.about.story.paragraph1")}>
              {useContent("pages.about.story.paragraph1", "")}
            </p>
            <p {...editable("pages.about.story.paragraph2")}>
              {useContent("pages.about.story.paragraph2", "")}
            </p>
            <a
              className="btn btn-primary"
              href={wa}
              target="_blank"
              rel="noopener"
              data-coruja-event="whatsapp_click"
              data-coruja-event-label="about_whatsapp"
              {...editableButton(
                "global.cta.headerLabel",
                "Botão da página sobre",
              )}
            >
              {useContent("global.cta.headerLabel", "")}
            </a>
          </div>
          <div className="about-panel">
            <Bolt />
            <strong {...editable("global.brand.name")}>
              {useContent("global.brand.name", "")}
            </strong>
            <p {...editable("global.brand.description")}>
              {useContent("global.brand.description", "")}
            </p>
            <div className="area-tags" data-coruja-collection="serviceAreas">
              {areas.map((area, index) => (
                <span
                  key={area.id}
                  data-coruja-item-id={area.id}
                  {...editable(collectionPath("serviceAreas", index, "name"))}
                >
                  {area.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="section values-section">
        <div className="container">
          <SectionTitle
            eyebrow={useContent("pages.about.values.eyebrow", "")}
            title={useContent("pages.about.values.title", "")}
            eyebrowPath="pages.about.values.eyebrow"
            titlePath="pages.about.values.title"
          />
          <div className="values-grid" data-coruja-collection="values">
            {values.map((item, index) => (
              <article key={item.id} data-coruja-item-id={item.id}>
                <span {...editable(collectionPath("values", index, "icon"))}>
                  {item.icon}
                </span>
                <h3 {...editable(collectionPath("values", index, "title"))}>
                  {item.title}
                </h3>
                <p
                  {...editable(collectionPath("values", index, "description"))}
                >
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
function ContactPage() {
  const waNumber = useContent("global.contact.whatsappRaw", "");
  const phone = useContent("global.contact.phone", "");
  const email = useContent("global.contact.email", "");
  const address = useContent("global.contact.address", "");
  const area = useContent("global.contact.serviceArea", "");
  const hours = useContent("global.contact.businessHoursWeek", "");
  const tel = useTelHref();
  const enabled = Boolean(useContent("pages.contact.form.enabled", true));
  const formWhatsappMessage = useContent(
    "pages.contact.form.whatsappMessage",
    "",
  );
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lines = [
      formWhatsappMessage,
      `Nome: ${data.get("name") || ""}`,
      `Telefone: ${data.get("phone") || ""}`,
      `Serviço: ${data.get("service") || ""}`,
      `Detalhes: ${data.get("message") || ""}`,
    ];
    window.open(
      buildWhatsAppHref(waNumber, lines.join("\n")),
      "_blank",
      "noopener,noreferrer",
    );
  }
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <Layout>
      <PageHero page="contact" />
      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-info">
            <div className="contact-card">
              <span>01</span>
              <div>
                <strong {...editable("global.contact.phone")}>{phone}</strong>
                <a
                  href={tel}
                  data-coruja-event="tel_click"
                  data-coruja-event-label="contact_phone"
                  {...editable("global.contact.phone")}
                >
                  {phone}
                </a>
              </div>
            </div>
            <div className="contact-card">
              <span>02</span>
              <div>
                <strong {...editable("global.contact.email")}>{email}</strong>
                <a
                  href={`mailto:${email}`}
                  {...editable("global.contact.email")}
                >
                  {email}
                </a>
              </div>
            </div>
            <div className="contact-card">
              <span>03</span>
              <div>
                <strong {...editable("global.contact.serviceArea")}>
                  {area}
                </strong>
                <p {...editable("global.contact.businessHoursWeek")}>{hours}</p>
              </div>
            </div>
            <div className="map-card">
              <div>
                <Eyebrow path="pages.contact.map.title">
                  {useContent("pages.contact.map.title", "")}
                </Eyebrow>
                <h3 {...editable("global.contact.address")}>{address}</h3>
                <p {...editable("pages.contact.map.description")}>
                  {useContent("pages.contact.map.description", "")}
                </p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener"
                  {...editableButton(
                    "pages.contact.map.buttonLabel",
                    "Botão do mapa",
                  )}
                >
                  {useContent("pages.contact.map.buttonLabel", "")} ↗
                </a>
              </div>
              <div className="map-pattern">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
          {enabled && (
            <form
              className="quote-form"
              onSubmit={submit}
              data-coruja-form="quote_form"
              data-coruja-event="form_submit"
              data-coruja-event-label="quote_form"
              data-coruja-visible-path="pages.contact.form.enabled"
              data-coruja-value={formWhatsappMessage}
              {...editable("pages.contact.form.whatsappMessage")}
            >
              <div>
                <Eyebrow path="pages.contact.form.title">
                  {useContent("pages.contact.form.title", "")}
                </Eyebrow>
                <h2 {...editable("pages.contact.form.title")}>
                  {useContent("pages.contact.form.title", "")}
                </h2>
                <p {...editable("pages.contact.form.description")}>
                  {useContent("pages.contact.form.description", "")}
                </p>
              </div>
              <label {...editable("pages.contact.form.nameLabel")}>
                {useContent("pages.contact.form.nameLabel", "")}
                <input
                  name="name"
                  required
                  placeholder={useContent(
                    "pages.contact.form.namePlaceholder",
                    "",
                  )}
                />
              </label>
              <label {...editable("pages.contact.form.phoneLabel")}>
                {useContent("pages.contact.form.phoneLabel", "")}
                <input
                  name="phone"
                  required
                  placeholder={useContent(
                    "pages.contact.form.phonePlaceholder",
                    "",
                  )}
                />
              </label>
              <label {...editable("pages.contact.form.serviceLabel")}>
                {useContent("pages.contact.form.serviceLabel", "")}
                <input
                  name="service"
                  required
                  placeholder={useContent(
                    "pages.contact.form.servicePlaceholder",
                    "",
                  )}
                />
              </label>
              <label {...editable("pages.contact.form.messageLabel")}>
                {useContent("pages.contact.form.messageLabel", "")}
                <textarea
                  name="message"
                  rows="5"
                  placeholder={useContent(
                    "pages.contact.form.messagePlaceholder",
                    "",
                  )}
                />
              </label>
              <button
                className="btn btn-primary"
                type="submit"
                {...editableButton(
                  "pages.contact.form.submitText",
                  "Botão de envio do formulário",
                )}
              >
                {useContent("pages.contact.form.submitText", "")}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
}
function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return "";
  }
}
function BlogPage() {
  const [posts, setPosts] = useState([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetchCorujaBlogPosts().then((data) => {
      if (active) {
        setPosts(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Layout>
      <section className="page-hero blog-hero">
        <div className="container">
          <Eyebrow path="pages.blog.eyebrow">
            {useContent("pages.blog.eyebrow", "")}
          </Eyebrow>
          <h1 {...editable("pages.blog.title")}>
            {useContent("pages.blog.title", "")}
          </h1>
          <p {...editable("pages.blog.description")}>
            {useContent("pages.blog.description", "")}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <span style={visuallyHidden} {...editable("pages.blog.backLabel")}>
            {useContent("pages.blog.backLabel", "")}
          </span>
          <span style={visuallyHidden} {...editable("pages.blog.emptyMessage")}>
            {useContent("pages.blog.emptyMessage", "")}
          </span>
          {loading ? (
            <div className="blog-empty">
              <div className="runtime-loader" />
            </div>
          ) : posts.length ? (
            <div className="blog-grid">
              {posts.map((post) => (
                <article key={post.slug}>
                  <a
                    className="blog-image"
                    href={siteHref(`/blog/${post.slug}`)}
                  >
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.coverImageAlt} />
                    ) : (
                      <div>
                        <Bolt />
                      </div>
                    )}
                  </a>
                  <div className="blog-body">
                    <span>{post.category || formatDate(post.publishedAt)}</span>
                    <h2>
                      <a href={siteHref(`/blog/${post.slug}`)}>{post.title}</a>
                    </h2>
                    <p>{post.excerpt}</p>
                    <a
                      href={siteHref(`/blog/${post.slug}`)}
                      {...editableButton(
                        "pages.blog.readLabel",
                        "Botão de leitura do artigo",
                      )}
                    >
                      {useContent("pages.blog.readLabel", "")} →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="blog-empty">
              <Bolt />
              <p {...editable("pages.blog.emptyMessage")}>
                {useContent("pages.blog.emptyMessage", "")}
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
function BlogPostPage() {
  const slug = currentSlug();
  const [post, setPost] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetchCorujaBlogPost(slug).then((data) => {
      if (active) {
        setPost(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);
  if (loading)
    return (
      <Layout>
        <div className="post-state">
          <div className="runtime-loader" />
        </div>
      </Layout>
    );
  if (!post) return <NotFound />;
  const html =
    post.contentHtml ||
    (Array.isArray(post.content)
      ? post.content.map((p) => `<p>${p}</p>`).join("")
      : String(post.content || ""));
  return (
    <Layout post={post}>
      <article className="post">
        <div className="container post-head">
          <a href={siteHref("/blog")} {...editable("pages.blog.backLabel")}>
            ← {useContent("pages.blog.backLabel", "")}
          </a>
          <span>{post.category || formatDate(post.publishedAt)}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          {post.coverImage && (
            <img src={post.coverImage} alt={post.coverImageAlt} />
          )}
        </div>
        <div
          className="container post-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </Layout>
  );
}
function NotFound() {
  const wa = useWhatsAppUrl(),
    brand = useContent("global.brand.name", "");
  return (
    <Layout>
      <section className="not-found">
        <div>
          <Bolt />
          <h1>404</h1>
          <a
            className="btn btn-primary"
            href={siteHref("/")}
            {...editable("global.brand.name")}
          >
            {brand}
          </a>
          <a
            className="text-link"
            href={wa}
            target="_blank"
            rel="noopener"
            data-coruja-event="whatsapp_click"
            data-coruja-event-label="not_found_whatsapp"
            {...editableButton(
              "global.cta.headerLabel",
              "Contato da página não encontrada",
            )}
          >
            {useContent("global.cta.headerLabel", "")}
          </a>
        </div>
      </section>
    </Layout>
  );
}
function RouterView() {
  const route = currentRoute();
  const blogEnabled = Boolean(useContent("blog.enabled", true));
  if (route === "/") return <HomePage />;
  if (route === "/servicos") return <ServicesPage />;
  if (route === "/sobre") return <AboutPage />;
  if (route === "/contato") return <ContactPage />;
  if (route === "/blog" && blogEnabled) return <BlogPage />;
  if (route.startsWith("/blog/") && blogEnabled) return <BlogPostPage />;
  return <NotFound />;
}
export default function App() {
  return (
    <CorujaProvider>
      <CorujaContentGate>
        <RouterView />
      </CorujaContentGate>
    </CorujaProvider>
  );
}
