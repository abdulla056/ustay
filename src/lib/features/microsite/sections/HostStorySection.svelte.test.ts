import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HostStorySection from './HostStorySection.svelte';
import type { HostStoryData } from '../types';

const full: HostStoryData = {
	story: { heading: 'A house built to watch the weather', body: { html: '<p>Built in 1954.</p>' } },
	host: {
		displayName: 'Hajar Mansor',
		bio: { html: '<p>I grew up below the house.</p>' },
		avatar: {
			src: '/prototype/lake-mountain.jpg',
			alt: 'Hajar on the veranda',
			width: 2000,
			height: 1333
		},
		hostingSince: 2019,
		languages: ['en', 'ms']
	}
};

describe('HostStorySection', () => {
	it('renders story, host and facts, keeping heading order', async () => {
		const screen = render(HostStorySection, { data: full, variant: 'default' });
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'The story' }))
			.toBeVisible();
		await expect.element(screen.getByText('A house built to watch the weather')).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Hajar Mansor' }))
			.toBeVisible();
		await expect.element(screen.getByText('Built in 1954.')).toBeVisible();
		await expect.element(screen.getByText('I grew up below the house.')).toBeVisible();
		await expect.element(screen.getByText('2019')).toBeVisible();
		await expect.element(screen.getByText('English, Malay')).toBeVisible();
		await expect
			.element(screen.getByRole('img', { name: 'Hajar on the veranda' }))
			.toBeInTheDocument();
		expect(document.querySelector('[data-section="host_story"]')).not.toBeNull();
	});

	it('host alone takes the h2 and shows an initial without an avatar', async () => {
		const screen = render(HostStorySection, {
			data: { story: null, host: { ...full.host!, avatar: null, bio: null, hostingSince: null } },
			variant: 'default'
		});
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Your host' }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Hajar Mansor' }))
			.toBeVisible();
		expect(document.querySelector('img')).toBeNull();
		expect(document.body.textContent).not.toContain('Hosting since');
	});

	it('shows the spine number only when given one', async () => {
		render(HostStorySection, { data: full, variant: 'default', number: '04' });
		expect(document.body.textContent).toContain('04 — The story');
	});

	it('maps codes, uppercases unknown ones and leaves free text alone', async () => {
		const screen = render(HostStorySection, {
			data: { story: null, host: { ...full.host!, languages: ['en', 'English', 'xx', 'zh-Hans'] } },
			variant: 'default'
		});
		await expect.element(screen.getByText('English, English, XX, Chinese')).toBeVisible();
	});

	it('keeps headings inside the owner prose below the section h2', async () => {
		render(HostStorySection, {
			data: {
				...full,
				story: { heading: null, body: { html: '<h3>The restoration</h3><p>x</p>' } }
			},
			variant: 'default'
		});
		expect(document.querySelectorAll('[data-section="host_story"] h1')).toHaveLength(0);
		expect(document.querySelectorAll('[data-section="host_story"] h2')).toHaveLength(1);
		expect(document.querySelector('[data-section="host_story"] h3')?.textContent).toBe(
			'The restoration'
		);
	});

	it('takes the first character of a name that starts with an emoji', async () => {
		render(HostStorySection, {
			data: { story: null, host: { ...full.host!, displayName: '🌿 Hajar', avatar: null } },
			variant: 'default'
		});
		expect(document.querySelector('[aria-hidden="true"].font-display')?.textContent?.trim()).toBe(
			'🌿'
		);
	});
});
