import { json } from '@sveltejs/kit';
import { JSDOM } from 'jsdom';

export async function GET() {
    try {
        const url =
            'https://www.edelweissmf.com/statutory/portfolio-of-schemes';

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        const dom = new JSDOM(html, {
            url,
            runScripts: 'dangerously',
            resources: 'usable'
        });

        // Wait for scripts/resources to execute
        await new Promise((resolve) => {
            dom.window.addEventListener('load', resolve);
        });

        const document = dom.window.document;

        return json({
            success: true,
            title: document.title,
            html: document.documentElement.outerHTML
        });

    } catch (error) {
        console.error(error);

        return json(
            {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : String(error)
            },
            { status: 500 }
        );
    }
}