(() => {
    const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
    const videoExtensions = new Set(['mp4', 'mov', 'webm', 'ogg']);
    const rowHeight = 8;
    const galleryGap = 32;

    const getYouTubeId = url => {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.hostname === 'youtu.be') {
                return parsedUrl.pathname.slice(1);
            }
            return parsedUrl.searchParams.get('v');
        } catch {
            return null;
        }
    };

    const bindYouTube = item => {
        const url = item.dataset.youtubeUrl;
        const videoId = getYouTubeId(url);
        if (!videoId) {
            return;
        }

        item.classList.add('gallery-youtube-card');
        const link = document.createElement('button');
        link.type = 'button';
        link.setAttribute('aria-label', 'Play this video on the portfolio');

        const thumbnail = document.createElement('img');
        thumbnail.src = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
        thumbnail.alt = 'Watch this animation on YouTube';
        thumbnail.loading = 'lazy';

        const play = document.createElement('span');
        play.className = 'gallery-youtube-play';
        play.setAttribute('aria-hidden', 'true');
        play.textContent = 'Play on YouTube';

        link.append(thumbnail, play);
        link.addEventListener('click', () => {
            const fallback = document.createElement('a');
            fallback.className = 'gallery-youtube-fallback';
            fallback.href = url;
            fallback.target = '_blank';
            fallback.rel = 'noopener noreferrer';
            fallback.textContent = window.location.protocol === 'file:'
                ? 'Open on YouTube (local preview)'
                : 'Open on YouTube';

            if (window.location.protocol === 'file:') {
                item.replaceChildren(fallback);
                return;
            }

            const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`);
            const startTime = new URL(url).searchParams.get('t');
            if (startTime) {
                embedUrl.searchParams.set('start', parseStartTime(startTime));
            }
            embedUrl.searchParams.set('autoplay', '1');
            embedUrl.searchParams.set('origin', window.location.origin);

            const player = document.createElement('iframe');
            player.src = embedUrl;
            player.title = 'YouTube video player';
            player.referrerPolicy = 'strict-origin-when-cross-origin';
            player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            player.allowFullscreen = true;

            item.replaceChildren(player, fallback);
        });
        item.replaceChildren(link);
    };

    const parseStartTime = value => {
        if (/^\d+$/.test(value)) {
            return value;
        }
        const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
        if (!match) {
            return '0';
        }
        return String((Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0));
    };

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

        gallery.querySelectorAll('.gallery-item, .gallery-youtube-item').forEach(item => {
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
            gallery.querySelectorAll('[data-youtube-url]').forEach(bindYouTube);
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
