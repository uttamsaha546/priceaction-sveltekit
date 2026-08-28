import { json } from "@sveltejs/kit";
import { APPDB } from "$lib/server/appdb";

export async function GET({ url }) {

    const date = url.searchParams.get('date');

    try {
        if (!date) {
            throw new Error("Missing Date");
        }

        const success = APPDB.Bhavcopy.delete(date);
        return json({ success });
    } catch (error) {
        return json({ message: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
    }
}