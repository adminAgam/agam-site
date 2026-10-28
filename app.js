(async function () {
  const defaults = window.AGAM_DEFAULT_CONTENT || {
    settings: {},
    clients: [],
    projects: []
  };

  async function getContent() {
    const cfg = window.AGAM_BACKEND || {};

    const configured =
      /^https:\/\/.+\.supabase\.co$/.test(cfg.url || "") &&
      !String(cfg.anonKey || "").startsWith("PEGA_");

    if (!configured || !window.supabase) return defaults;

    try {
      const sb = window.supabase.createClient(cfg.url, cfg.anonKey);

      const [pr, cl, st, gi] = await Promise.all([
        sb.from("projects")
          .select("*")
          .eq("active", true)
          .order("sort_order"),

        sb.from("clients")
          .select("*")
          .eq("active", true)
          .order("sort_order"),

        sb.from("site_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle(),

        sb.from("project_images")
          .select("*")
          .eq("active", true)
          .order("sort_order")
      ]);

      if (pr.error || cl.error || st.error || gi.error) {
        throw pr.error || cl.error || st.error || gi.error;
      }

      const galleries = (gi.data || []).reduce((acc, image) => {
        (acc[image.project_id] ??= []).push(image.image_url);
        return acc;
      }, {});

      return {
        projects: (pr.data || []).map(x => ({
          id: x.id,
          title: x.title,
          image: x.image_url,
          description: x.description || "",
          active: x.active,
          order: x.sort_order,
          gallery: galleries[x.id] || []
        })),

        clients: (cl.data || []).map(x => ({
          id: x.id,
          name: x.name,
          image: x.image_url,
          active: x.active,
          order: x.sort_order
        })),

        settings: st.data
          ? {
              whatsapp: st.data.whatsapp || "",
              email: st.data.email || "",
              phones: st.data.phones || "",
              location: st.data.location || ""
            }
          : defaults.settings
      };
    } catch (e) {
      console.warn(
        "AGAM backend no disponible; usando contenido base.",
        e
      );

      return defaults;
    }
  }

  const content = await getContent();

  const esc = (v = "") =>
    String(v).replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[c]
    );

  /* =========================================================
     CLIENTES
     ========================================================= */

  const clientsGrid = document.getElementById("clientsGrid");

  if (clientsGrid) {
    clientsGrid.innerHTML = (content.clients || [])
      .filter(x => x.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        c => `
          <div class="logoBox">
            <img
              src="${esc(c.image)}"
              alt="${esc(c.name)}"
              loading="lazy"
            >
          </div>
        `
      )
      .join("");
  }

  /* =========================================================
     PROYECTOS
     ========================================================= */

  const projectsGrid = document.getElementById("projectsGrid");

  if (projectsGrid) {
    projectsGrid.innerHTML = (content.projects || [])
      .filter(x => x.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        p => `
          <article
            class="projectTile"
            data-project="${esc(p.id)}"
          >
            <img
              src="${esc(p.image)}"
              alt="${esc(p.title)}"
              loading="lazy"
            >

            <div>
              <strong>${esc(p.title)}</strong>

              ${
                p.description
                  ? `<p>${esc(p.description)}</p>`
                  : ""
              }

              ${
                p.gallery?.length
                  ? `<small class="photoCount">
                       📷 ${p.gallery.length + 1} fotos
                     </small>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");
  }

  /* =========================================================
     AÑO
     ========================================================= */

  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* =========================================================
     MENÚ RESPONSIVE
     ========================================================= */

  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".nav__list");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");

      toggle.setAttribute(
        "aria-expanded",
        String(open)
      );
    });

    menu.addEventListener("click", e => {
      if (e.target?.tagName === "A") {
        menu.classList.remove("is-open");

        toggle.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    });
  }

  /* =========================================================
     ANIMACIONES REVEAL
     ========================================================= */

  const items = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }),
      {
        threshold: 0.12
      }
    );

    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el =>
      el.classList.add("is-visible")
    );
  }

  /* =========================================================
     WHATSAPP Y CONTACTO
     ========================================================= */

  const contactLocation = content.settings?.location || "Cajicá, Cundinamarca";
  const contactPhones = content.settings?.phones || "3137297652 • 3107816552";
  const contactEmail = content.settings?.email || "proyectos@agamingenieria.com";

  const summaryEl = document.getElementById("contactSummary");
  const locationEl = document.getElementById("contactLocation");
  const phonesEl = document.getElementById("contactPhones");
  const emailEl = document.getElementById("contactEmail");

  if (summaryEl) summaryEl.textContent = `${contactLocation} • Tel: ${contactPhones} • ${contactEmail}`;
  if (locationEl) locationEl.textContent = contactLocation;
  if (phonesEl) phonesEl.textContent = contactPhones;
  if (emailEl) emailEl.textContent = contactEmail;

  const WA_NUMBER = (
    content.settings?.whatsapp ||
    "573137297652"
  ).replace(/\D/g, "");

  const waLink = message =>
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  document
    .getElementById("quoteBtn")
    ?.addEventListener("click", () => {
      const name =
        document
          .getElementById("name")
          ?.value.trim() ||
        "un(a) interesado(a)";

      const phone =
        document
          .getElementById("phone")
          ?.value.trim();

      const service =
        document
          .getElementById("service")
          ?.value ||
        "Servicio";

      window.open(
        waLink(
          `Hola AGAM Ingeniería SAS, soy ${name}.\n` +
          `Quiero cotizar: ${service}.\n` +
          `${phone ? `Mi teléfono es: ${phone}.\n` : ""}` +
          `¿Me pueden orientar con los siguientes pasos?`
        ),
        "_blank",
        "noopener,noreferrer"
      );
    });

  const wa = document.getElementById("waFloat");

  if (wa) {
    wa.href = waLink(
      "Hola AGAM Ingeniería SAS, quiero información y cotizar un proyecto."
    );

    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
  }

  document
    .getElementById("contactForm")
    ?.addEventListener("submit", e => {
      e.preventDefault();

      const d = new FormData(e.currentTarget);

      window.open(
        waLink(
          `Hola AGAM Ingeniería SAS, soy ${d.get("nombre")}\n` +
          `Email: ${d.get("email")}\n` +
          `Teléfono: ${d.get("telefono")}\n\n` +
          `Necesidad:\n${d.get("mensaje")}\n\n` +
          `¿Me confirman disponibilidad y próximos pasos?`
        ),
        "_blank",
        "noopener,noreferrer"
      );
    });

  const emailBtn =
    document.getElementById("emailBtn");

  if (emailBtn) {
    const em =
      content.settings?.email ||
      "proyectos@agamingenieria.com";

    emailBtn.href =
      `mailto:${em}` +
      `?subject=${encodeURIComponent(
        "Solicitud de cotización - AGAM Ingeniería SAS"
      )}` +
      `&body=${encodeURIComponent(
        "Hola AGAM Ingeniería SAS,\n\n" +
        "Quiero solicitar una cotización. " +
        "Por favor contáctenme.\n\nGracias."
      )}`;
  }

  /* =========================================================
     MODAL GENERAL DE PROYECTOS
     ========================================================= */

  const gallery =
    document.getElementById("galleryModal");

  window.openGallery = () => {
    gallery?.classList.add("active");

    gallery?.setAttribute(
      "aria-hidden",
      "false"
    );
  };

  window.closeGallery = () => {
    gallery?.classList.remove("active");

    gallery?.setAttribute(
      "aria-hidden",
      "true"
    );
  };

  document
    .querySelector(".galleryClose")
    ?.addEventListener(
      "click",
      window.closeGallery
    );

  document
    .querySelector(".galleryOverlay")
    ?.addEventListener(
      "click",
      window.closeGallery
    );

  /* =========================================================
     GALERÍA DE UN PROYECTO
     ========================================================= */

  const pg =
    document.getElementById(
      "projectGalleryModal"
    );

  const pgGrid =
    document.getElementById(
      "projectGalleryGrid"
    );

  const pgTitle =
    document.getElementById(
      "projectGalleryTitle"
    );

  let currentProjectPhotos = [];
  let currentProjectTitle = "";

  function openProjectGallery(
    project,
    photos
  ) {
    if (!pg || !pgGrid) return;

    currentProjectPhotos =
      (photos || []).filter(Boolean);

    currentProjectTitle =
      project?.title || "Proyecto";

    if (pgTitle) {
      pgTitle.textContent =
        currentProjectTitle;
    }

    pgGrid.innerHTML =
      currentProjectPhotos
        .map(
          (src, index) => `
            <button
              class="projectPhoto"
              type="button"
              data-index="${index}"
              aria-label="Abrir foto ${index + 1} de ${currentProjectPhotos.length}"
            >
              <img
                src="${esc(src)}"
                alt="${esc(currentProjectTitle)} - foto ${index + 1}"
                loading="lazy"
              >
            </button>
          `
        )
        .join("");

    pg.classList.add("active");

    pg.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeProjectGallery() {
    pg?.classList.remove("active");

    pg?.setAttribute(
      "aria-hidden",
      "true"
    );

    currentProjectPhotos = [];
    currentProjectTitle = "";
  }

  document
    .querySelector(".projectGalleryClose")
    ?.addEventListener(
      "click",
      closeProjectGallery
    );

  document
    .querySelector(".projectGalleryOverlay")
    ?.addEventListener(
      "click",
      closeProjectGallery
    );

  /* =========================================================
     FASE 3.3.2
     LIGHTBOX PROFESIONAL
     ========================================================= */

  const zoom =
    document.getElementById("zoomModal");

  const zoomImg =
    document.getElementById("zoomImg");

  const zoomCaption =
    document.getElementById("zoomCaption");

  const zoomCounter =
    document.getElementById("zoomCounter");

  const zoomPrev =
    document.getElementById("zoomPrev");

  const zoomNext =
    document.getElementById("zoomNext");

  let zoomPhotos = [];
  let zoomIndex = 0;
  let zoomTitle = "";

  function renderZoom() {
    if (
      !zoom ||
      !zoomImg ||
      !zoomPhotos.length
    ) {
      return;
    }

    const src =
      zoomPhotos[zoomIndex];

    zoomImg.src = src;

    zoomImg.alt =
      zoomTitle
        ? `${zoomTitle} - foto ${zoomIndex + 1}`
        : `Foto ${zoomIndex + 1}`;

    if (zoomCaption) {
      zoomCaption.textContent =
        zoomTitle || "";
    }

    if (zoomCounter) {
      zoomCounter.textContent =
        `${zoomIndex + 1} / ${zoomPhotos.length}`;
    }

    const multiple =
      zoomPhotos.length > 1;

    if (zoomPrev) {
      zoomPrev.hidden = !multiple;
      zoomPrev.disabled = !multiple;
    }

    if (zoomNext) {
      zoomNext.hidden = !multiple;
      zoomNext.disabled = !multiple;
    }
  }

  function openZoom(
    src,
    title = "",
    photos = null,
    index = null
  ) {
    if (!zoom || !zoomImg) return;

    zoomPhotos =
      Array.isArray(photos) &&
      photos.length
        ? photos.filter(Boolean)
        : [src].filter(Boolean);

    if (!zoomPhotos.length) return;

    let requestedIndex =
      Number.isInteger(index)
        ? index
        : zoomPhotos.indexOf(src);

    if (
      requestedIndex < 0 ||
      requestedIndex >= zoomPhotos.length
    ) {
      requestedIndex = 0;
    }

    zoomIndex = requestedIndex;
    zoomTitle = title || "";

    renderZoom();

    zoom.classList.add("active");

    zoom.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeZoom() {
    if (!zoom || !zoomImg) return;

    zoom.classList.remove("active");

    zoom.setAttribute(
      "aria-hidden",
      "true"
    );

    zoomImg.src = "";

    if (zoomCaption) {
      zoomCaption.textContent = "";
    }

    if (zoomCounter) {
      zoomCounter.textContent = "";
    }

    zoomPhotos = [];
    zoomIndex = 0;
    zoomTitle = "";
  }

  function showPreviousPhoto() {
    if (!zoomPhotos.length) return;

    zoomIndex =
      (
        zoomIndex -
        1 +
        zoomPhotos.length
      ) %
      zoomPhotos.length;

    renderZoom();
  }

  function showNextPhoto() {
    if (!zoomPhotos.length) return;

    zoomIndex =
      (
        zoomIndex +
        1
      ) %
      zoomPhotos.length;

    renderZoom();
  }

  zoomPrev?.addEventListener(
    "click",
    showPreviousPhoto
  );

  zoomNext?.addEventListener(
    "click",
    showNextPhoto
  );

  /* =========================================================
     FASE 3.3.3
     NAVEGACIÓN TÁCTIL / SWIPE
     ========================================================= */

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let touchTracking = false;

  const SWIPE_MIN_DISTANCE = 50;
  const SWIPE_VERTICAL_TOLERANCE = 70;

  zoomImg?.addEventListener(
    "touchstart",
    e => {
      if (
        !zoom?.classList.contains("active") ||
        zoomPhotos.length <= 1 ||
        e.touches.length !== 1
      ) {
        touchTracking = false;
        return;
      }

      const touch = e.touches[0];

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      touchEndX = touchStartX;
      touchEndY = touchStartY;

      touchTracking = true;
    },
    { passive: true }
  );

  zoomImg?.addEventListener(
    "touchmove",
    e => {
      if (
        !touchTracking ||
        e.touches.length !== 1
      ) {
        return;
      }

      const touch = e.touches[0];

      touchEndX = touch.clientX;
      touchEndY = touch.clientY;
    },
    { passive: true }
  );

  zoomImg?.addEventListener(
    "touchend",
    e => {
      if (!touchTracking) return;

      /*
       * Si touchmove no llegó a ejecutarse,
       * tomamos la posición final desde
       * changedTouches.
       */
      if (e.changedTouches?.length) {
        const touch = e.changedTouches[0];

        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
      }

      touchTracking = false;

      if (
        !zoom?.classList.contains("active") ||
        zoomPhotos.length <= 1
      ) {
        return;
      }

      const distanceX =
        touchEndX - touchStartX;

      const distanceY =
        touchEndY - touchStartY;

      const absX = Math.abs(distanceX);
      const absY = Math.abs(distanceY);

      /*
       * Ignora:
       * - toques simples;
       * - movimientos demasiado cortos;
       * - desplazamientos principalmente verticales.
       */
      if (
        absX < SWIPE_MIN_DISTANCE ||
        absY > SWIPE_VERTICAL_TOLERANCE ||
        absY >= absX
      ) {
        return;
      }

      /*
       * Swipe hacia la izquierda:
       * fotografía siguiente.
       */
      if (distanceX < 0) {
        showNextPhoto();
        return;
      }

      /*
       * Swipe hacia la derecha:
       * fotografía anterior.
       */
      showPreviousPhoto();
    },
    { passive: true }
  );

  zoomImg?.addEventListener(
    "touchcancel",
    () => {
      touchTracking = false;
    },
    { passive: true }
  );

  document
    .querySelector(".zoomClose")
    ?.addEventListener(
      "click",
      closeZoom
    );

  document
    .querySelector(".zoomOverlay")
    ?.addEventListener(
      "click",
      closeZoom
    );

  /* =========================================================
     CLICK SOBRE PROYECTOS
     ========================================================= */

  projectsGrid?.addEventListener(
    "click",
    e => {
      const tile =
        e.target.closest(".projectTile");

      if (!tile) return;

      const project =
        (content.projects || []).find(
          x =>
            String(x.id) ===
            tile.dataset.project
        );

      if (!project) return;

      const photos = [
        project.image,
        ...(project.gallery || [])
      ].filter(Boolean);

      /*
       * Si solo existe la portada,
       * se abre directamente en lightbox.
       */
      if (photos.length <= 1) {
        openZoom(
          photos[0] || project.image,
          project.title,
          photos.length
            ? photos
            : [project.image],
          0
        );

        return;
      }

      /*
       * Si hay varias fotografías,
       * primero se abre la galería.
       */
      openProjectGallery(
        project,
        photos
      );
    }
  );

  /* =========================================================
     CLICK SOBRE FOTO DE GALERÍA
     ========================================================= */

  pgGrid?.addEventListener(
    "click",
    e => {
      const button =
        e.target.closest(".projectPhoto");

      if (!button) return;

      const index =
        Number(button.dataset.index);

      if (!Number.isInteger(index)) {
        return;
      }

      if (
        index < 0 ||
        index >= currentProjectPhotos.length
      ) {
        return;
      }

      openZoom(
        currentProjectPhotos[index],
        currentProjectTitle,
        currentProjectPhotos,
        index
      );
    }
  );

  /* =========================================================
     TECLADO
     ========================================================= */

  document.addEventListener(
    "keydown",
    e => {
      /*
       * ESC cierra primero el modal
       * que esté más arriba.
       */
      if (e.key === "Escape") {
        if (
          zoom?.classList.contains(
            "active"
          )
        ) {
          closeZoom();
          return;
        }

        if (
          pg?.classList.contains(
            "active"
          )
        ) {
          closeProjectGallery();
          return;
        }

        window.closeGallery();
        return;
      }

      /*
       * Las flechas solamente funcionan
       * cuando el lightbox está abierto.
       */
      if (
        !zoom?.classList.contains(
          "active"
        )
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPreviousPhoto();
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        showNextPhoto();
      }
    }
  );
})();