(() => {
    const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
    const videoExtensions = new Set(['mp4', 'mov', 'webm', 'ogg']);
    const rowHeight = 8;
    const galleryGap = 32;

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-content" role="dialog" aria-modal="true" aria-label="Expanded media viewer">
            <button class="lightbox-close" type="button" aria-label="Close expanded media">&times;</button>
            <div class="lightbox-media"></div>
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxMedia = lightbox.querySelector('.lightbox-media');

    const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        lightboxMedia.replaceChildren();
        document.body.classList.remove('lightbox-open');
    };

    const openLightbox = media => {
        const expandedMedia = media.cloneNode(true);
        expandedMedia.removeAttribute('loading');
        expandedMedia.classList.add('lightbox-media-item');
        if (expandedMedia.tagName === 'VIDEO') {
            expandedMedia.controls = true;
            expandedMedia.preload = 'auto';
        }
        lightboxMedia.replaceChildren(expandedMedia);
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
    };

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
            closeLightbox();
        }
    });

    const sizeGalleryItems = gallery => {
        const computedStyle = getComputedStyle(gallery);
        const gap = parseFloat(computedStyle.rowGap) || galleryGap;
        const row = parseFloat(computedStyle.gridAutoRows) || rowHeight;

        gallery.querySelectorAll('.gallery-item').forEach(item => {
            const media = item.querySelector('img, video');
            if (!media || !media.clientHeight) {
                return;
            }
            const extraSpace = item === gallery.firstElementChild && gallery.dataset.firstCaption ? 48 : 0;
            const span = Math.ceil((media.clientHeight + gap + extraSpace) / (row + gap));
            item.style.gridRowEnd = `span ${span}`;
        });
    };

    const bindMedia = (gallery, item, filename) => {
        const extension = filename.split('.').pop().toLowerCase();
        const subfolder = item.dataset.gallerySubfolder;
        const folderPath = subfolder
            ? `${encodeURIComponent(gallery.dataset.galleryFolder)}/${encodeURIComponent(subfolder)}`
            : encodeURIComponent(gallery.dataset.galleryFolder);
        const source = `../assets/images/${folderPath}/${encodeURIComponent(filename)}`;
        let media;

        if (videoExtensions.has(extension)) {
            item.classList.add('gallery-video-item');
            media = document.createElement('video');
            media.controls = true;
            media.preload = 'metadata';
            media.setAttribute('aria-label', filename);
        } else if (imageExtensions.has(extension)) {
            if (extension === 'png') {
                item.classList.add('png-media-item');
            }
            media = document.createElement('img');
            media.alt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
            media.loading = 'lazy';
        }

        if (!media) {
            return;
        }

        media.src = source;
        media.addEventListener('click', () => openLightbox(media));
        media.addEventListener('load', () => sizeGalleryItems(gallery));
        media.addEventListener('loadedmetadata', () => sizeGalleryItems(gallery));
        item.prepend(media);
    };

    document.querySelectorAll('.project-gallery[data-gallery-folder]').forEach(gallery => {
        const folder = gallery.dataset.galleryFolder;
        const files = window.portfolioMedia?.[folder] || [];

        if (gallery.dataset.galleryCustom === 'true') {
            gallery.querySelectorAll('[data-gallery-file]').forEach(item => {
                bindMedia(gallery, item, item.dataset.galleryFile);
            });
            sizeGalleryItems(gallery);
            window.addEventListener('resize', () => sizeGalleryItems(gallery));
            return;
        }

        gallery.replaceChildren(...files.map(filename => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            bindMedia(gallery, item, filename);

            return item;
        }));

        if (gallery.dataset.firstCaption && gallery.firstElementChild) {
            const caption = document.createElement('p');
            caption.className = 'gallery-caption';
            caption.textContent = gallery.dataset.firstCaption;
            gallery.firstElementChild.appendChild(caption);
        }

        sizeGalleryItems(gallery);
        window.addEventListener('resize', () => sizeGalleryItems(gallery));
    });
})();
