import * as XLSX from 'xlsx';

/*
 * ---------------------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------------------
 */

const SECTION_TYPES = Object.freeze({
    EQUITY: 'equity',
    DEBT: 'debt',
    MONEY_MARKET: 'money_market',
    REIT_INVIT: 'reit_invit',
    GOLD: 'gold',
    SILVER: 'silver',
    CASH: 'cash',
    OTHER: 'other'
});

const SECTION_KEYWORDS = [
    {
        type: SECTION_TYPES.EQUITY,
        keywords: [
            'equity & equity related',
            'equity and equity related',
            'equity & equity-related',
            'equity and equity-related'
        ]
    },

    {
        type: SECTION_TYPES.DEBT,
        keywords: [
            'debt instruments',
            'debt instrument'
        ]
    },

    {
        type: SECTION_TYPES.MONEY_MARKET,
        keywords: [
            'money market instruments',
            'money market instrument'
        ]
    },

    {
        type: SECTION_TYPES.REIT_INVIT,
        keywords: [
            'reit/invit instruments',
            'reit / invit instruments',
            'reit and invit instruments',
            'reit and invit',
            'reit/invit'
        ]
    },

    {
        type: SECTION_TYPES.GOLD,
        keywords: [
            'gold'
        ]
    },

    {
        type: SECTION_TYPES.SILVER,
        keywords: [
            'silver'
        ]
    },

    {
        type: SECTION_TYPES.CASH,
        keywords: [
            'treps / reverse repo',
            'treps/reverse repo',
            'reverse repo',
            'cash & cash equivalents',
            'cash and cash equivalents',
            'net receivables'
        ]
    }
];

const NAME_HEADERS = new Set([
    'name of the instrument',
    'name of the instrument / issuer',
    'name of instrument',
    'instrument name',
    'security name',
    'name'
]);

const ISIN_HEADERS = new Set([
    'isin',
    'isin code',
    'isin no',
    'isin no.',
    'isin number'
]);

const QUANTITY_HEADERS = new Set([
    'quantity',
    'qty',
    'no of shares',
    'no. of shares',
    'number of shares',
    'no of units',
    'no. of units',
    'units'
]);

const HEADER_SEARCH_LIMIT = 30;

const FUND_NAME_SEARCH_LIMIT = 8;

const REPORT_DATE_SEARCH_LIMIT = 20;


/*
 * ---------------------------------------------------------------------------
 * Generic helpers
 * ---------------------------------------------------------------------------
 */

export function clean(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function cleanOriginal(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isMeaningfulCell(cell) {
    if (!cell) {
        return false;
    }

    if (cell.v === null || cell.v === undefined) {
        return false;
    }

    if (typeof cell.v === 'string' && cell.v.trim() === '') {
        return false;
    }

    return true;
}

function isRowEmpty(row) {
    if (!row || row.length === 0) {
        return true;
    }

    for (let i = 0; i < row.length; i++) {
        if (row[i] !== null && row[i] !== undefined && row[i] !== '') {
            return false;
        }
    }

    return true;
}


/*
 * ---------------------------------------------------------------------------
 * Section detection
 * ---------------------------------------------------------------------------
 */

export function detectSection(value) {
    const text = clean(value);

    if (!text) {
        return null;
    }

    for (const section of SECTION_KEYWORDS) {
        for (const keyword of section.keywords) {
            if (
                text === keyword ||
                text.startsWith(`${keyword} `) ||
                text.startsWith(`${keyword}:`) ||
                text.startsWith(`${keyword}-`)
            ) {
                return section.type;
            }
        }
    }

    return null;
}


/*
 * ---------------------------------------------------------------------------
 * Sparse worksheet scanning
 * ---------------------------------------------------------------------------
 *
 * This is the important optimization.
 *
 * We inspect actual XLSX cells rather than first converting the entire
 * worksheet into a 2D array.
 *
 * A worksheet can have a !ref such as A1:GR200 even when most of those
 * columns contain only formatting/empty cells.
 * ---------------------------------------------------------------------------
 */

export function findSectionRows(worksheet) {
    const result = {
        equityRow: -1,
        debtRow: -1,
        moneyMarketRow: -1,
        reitInvitRow: -1,
        goldRow: -1,
        silverRow: -1,
        cashRow: -1,
        firstDataRow: Infinity,
        lastDataRow: -1,
        minColumn: Infinity,
        maxColumn: -1,
        hasMeaningfulCells: false
    };

    const addresses = Object.keys(worksheet);

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];

        // XLSX worksheet metadata: !ref, !merges, !cols, etc.
        if (address.charCodeAt(0) === 33) {
            continue;
        }

        const cell = worksheet[address];

        if (!isMeaningfulCell(cell)) {
            continue;
        }

        const decoded = XLSX.utils.decode_cell(address);

        const row = decoded.r;
        const column = decoded.c;

        result.hasMeaningfulCells = true;

        if (row < result.firstDataRow) {
            result.firstDataRow = row;
        }

        if (row > result.lastDataRow) {
            result.lastDataRow = row;
        }

        if (column < result.minColumn) {
            result.minColumn = column;
        }

        if (column > result.maxColumn) {
            result.maxColumn = column;
        }

        const section = detectSection(cell.v);

        if (!section) {
            continue;
        }

        switch (section) {
            case SECTION_TYPES.EQUITY:
                if (
                    result.equityRow === -1 ||
                    row < result.equityRow
                ) {
                    result.equityRow = row;
                }
                break;

            case SECTION_TYPES.DEBT:
                if (
                    result.debtRow === -1 ||
                    row < result.debtRow
                ) {
                    result.debtRow = row;
                }
                break;

            case SECTION_TYPES.MONEY_MARKET:
                if (
                    result.moneyMarketRow === -1 ||
                    row < result.moneyMarketRow
                ) {
                    result.moneyMarketRow = row;
                }
                break;

            case SECTION_TYPES.REIT_INVIT:
                if (
                    result.reitInvitRow === -1 ||
                    row < result.reitInvitRow
                ) {
                    result.reitInvitRow = row;
                }
                break;

            case SECTION_TYPES.GOLD:
                if (
                    result.goldRow === -1 ||
                    row < result.goldRow
                ) {
                    result.goldRow = row;
                }
                break;

            case SECTION_TYPES.SILVER:
                if (
                    result.silverRow === -1 ||
                    row < result.silverRow
                ) {
                    result.silverRow = row;
                }
                break;

            case SECTION_TYPES.CASH:
                if (
                    result.cashRow === -1 ||
                    row < result.cashRow
                ) {
                    result.cashRow = row;
                }
                break;
        }
    }

    if (!result.hasMeaningfulCells) {
        result.firstDataRow = -1;
        result.lastDataRow = -1;
        result.minColumn = -1;
        result.maxColumn = -1;
    }

    return result;
}


/*
 * ---------------------------------------------------------------------------
 * Actual worksheet bounds
 * ---------------------------------------------------------------------------
 */

function getActualRange(worksheet, sectionInfo = null) {
    const info = sectionInfo ?? findSectionRows(worksheet);

    if (!info.hasMeaningfulCells) {
        return null;
    }

    let startRow = info.firstDataRow;
    let endRow = info.lastDataRow;

    let startColumn = info.minColumn;
    let endColumn = info.maxColumn;

    /*
     * If this sheet contains equity, we don't need to materialize the entire
     * sheet. Start slightly before the equity section because the header can
     * occur a few rows above it.
     */
    if (info.equityRow !== -1) {
        startRow = Math.max(
            info.firstDataRow,
            info.equityRow - HEADER_SEARCH_LIMIT
        );

        /*
         * Stop at the first known section after equity.
         *
         * This is intentionally defensive. If no later section is known,
         * continue through the last meaningful row.
         */
        const possibleEndRows = [
            info.debtRow,
            info.moneyMarketRow,
            info.reitInvitRow,
            info.goldRow,
            info.silverRow,
            info.cashRow
        ].filter(
            (row) =>
                row !== -1 &&
                row > info.equityRow
        );

        if (possibleEndRows.length > 0) {
            endRow = Math.min(...possibleEndRows) - 1;
        }
    }

    if (startRow > endRow) {
        return null;
    }

    return {
        s: {
            r: startRow,
            c: startColumn
        },

        e: {
            r: endRow,
            c: endColumn
        }
    };
}


/*
 * ---------------------------------------------------------------------------
 * Row materialization
 * ---------------------------------------------------------------------------
 */

export function worksheetToRows(worksheet, sectionInfo = null) {
    const range = getActualRange(
        worksheet,
        sectionInfo
    );

    if (!range) {
        return [];
    }

    return XLSX.utils.sheet_to_json(
        worksheet,
        {
            header: 1,
            defval: null,
            raw: true,
            range
        }
    );
}


/*
 * ---------------------------------------------------------------------------
 * Fund name
 * ---------------------------------------------------------------------------
 */

export function findFundName(rows) {
    const limit = Math.min(
        rows.length,
        FUND_NAME_SEARCH_LIMIT
    );

    for (let i = 0; i < limit; i++) {
        const row = rows[i];

        if (!row) {
            continue;
        }

        for (let j = 0; j < row.length; j++) {
            const value = cleanOriginal(row[j]);

            if (!value) {
                continue;
            }

            const lower = value.toLowerCase();

            if (
                lower.includes('monthly portfolio statement') ||
                lower.includes('mutual fund')
            ) {
                continue;
            }

            if (
                lower.includes('fund') ||
                lower.includes('scheme')
            ) {
                return cleanFundName(value);
            }
        }
    }

    return null;
}

function cleanFundName(name) {
    return name
        .replace(/\s+/g, ' ')
        .replace(
            /\s*-\s*An Open Ended.*$/i,
            ''
        )
        .replace(
            /\s*-\s*An open ended.*$/i,
            ''
        )
        .replace(
            /\s*-\s*An open-ended.*$/i,
            ''
        )
        .replace(
            /\s*\(\s*An Open Ended.*$/i,
            ''
        )
        .replace(
            /\s*\(\s*An open ended.*$/i,
            ''
        )
        .replace(
            /\s*\(\s*An open-ended.*$/i,
            ''
        )
        .trim();
}


/*
 * ---------------------------------------------------------------------------
 * Report date
 * ---------------------------------------------------------------------------
 */

export function findReportDate(rows) {
    const limit = Math.min(
        rows.length,
        REPORT_DATE_SEARCH_LIMIT
    );

    for (let i = 0; i < limit; i++) {
        const row = rows[i];

        if (!row) {
            continue;
        }

        for (let j = 0; j < row.length; j++) {
            const value = clean(row[j]);

            if (!value) {
                continue;
            }

            const match = value.match(
                /as on\s+([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/i
            );

            if (!match) {
                continue;
            }

            const [, month, day, year] = match;

            const date = new Date(
                `${month} ${day}, ${year}`
            );

            if (!Number.isNaN(date.getTime())) {
                return date
                    .toISOString()
                    .slice(0, 10);
            }
        }
    }

    return null;
}


/*
 * ---------------------------------------------------------------------------
 * Header detection
 * ---------------------------------------------------------------------------
 */

export function findHeaderRow(
    rows,
    startAt = 0
) {
    const end = Math.min(
        rows.length,
        startAt + HEADER_SEARCH_LIMIT
    );

    for (let i = startAt; i < end; i++) {
        const row = rows[i];

        if (!row) {
            continue;
        }

        let hasName = false;
        let hasIsin = false;
        let hasQuantity = false;

        for (let j = 0; j < row.length; j++) {
            const value = clean(row[j]);

            if (NAME_HEADERS.has(value)) {
                hasName = true;
            }

            if (ISIN_HEADERS.has(value)) {
                hasIsin = true;
            }

            if (QUANTITY_HEADERS.has(value)) {
                hasQuantity = true;
            }

            if (
                hasName &&
                hasIsin &&
                hasQuantity
            ) {
                return i;
            }
        }
    }

    return -1;
}


/*
 * ---------------------------------------------------------------------------
 * Dynamic column detection
 * ---------------------------------------------------------------------------
 */

export function getColumnIndexes(headerRow) {
    const indexes = {
        name: -1,
        isin: -1,
        quantity: -1
    };

    if (!headerRow) {
        return indexes;
    }

    for (let i = 0; i < headerRow.length; i++) {
        const value = clean(headerRow[i]);

        if (
            indexes.name === -1 &&
            NAME_HEADERS.has(value)
        ) {
            indexes.name = i;
        }

        if (
            indexes.isin === -1 &&
            ISIN_HEADERS.has(value)
        ) {
            indexes.isin = i;
        }

        if (
            indexes.quantity === -1 &&
            QUANTITY_HEADERS.has(value)
        ) {
            indexes.quantity = i;
        }

        if (
            indexes.name !== -1 &&
            indexes.isin !== -1 &&
            indexes.quantity !== -1
        ) {
            break;
        }
    }

    return indexes;
}


/*
 * ---------------------------------------------------------------------------
 * Subtotal detection
 * ---------------------------------------------------------------------------
 */

export function looksLikeSubtotal(name) {
    if (!name) {
        return true;
    }

    const value = clean(name);

    return (
        value === 'sub total' ||
        value === 'subtotal' ||
        value === 'total' ||
        value === 'grand total' ||
        value.startsWith('total ')
    );
}


/*
 * ---------------------------------------------------------------------------
 * Quantity normalization
 * ---------------------------------------------------------------------------
 */

function normalizeQuantity(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value)
            ? value
            : null;
    }

    const normalized = String(value)
        .replace(/,/g, '')
        .trim();

    if (!normalized) {
        return null;
    }

    const number = Number(normalized);

    return Number.isFinite(number)
        ? number
        : null;
}


/*
 * ---------------------------------------------------------------------------
 * ISIN normalization
 * ---------------------------------------------------------------------------
 */

function normalizeIsin(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/\s+/g, '')
        .trim()
        .toUpperCase();
}


/*
 * ---------------------------------------------------------------------------
 * Detect whether a row contains a new section.
 * ---------------------------------------------------------------------------
 */

function findSectionInRow(row) {
    if (!row) {
        return null;
    }

    for (let i = 0; i < row.length; i++) {
        const section = detectSection(row[i]);

        if (section) {
            return section;
        }
    }

    return null;
}


/*
 * ---------------------------------------------------------------------------
 * Equity extraction
 * ---------------------------------------------------------------------------
 *
 * Defensive rules:
 *
 * - Header columns are detected dynamically.
 * - Empty rows are ignored.
 * - Subtotals stop the equity block.
 * - A subsequent investment section stops the equity block.
 * - Rows without a security name are ignored.
 * - ISIN/quantity are allowed to be missing; validation handles them later.
 * ---------------------------------------------------------------------------
 */

export function getEquityHolding(
    rows,
    {
        equityRow = 0
    } = {}
) {
    if (!rows || rows.length === 0) {
        return [];
    }

    const headerRowIndex = findHeaderRow(
        rows,
        // Math.max(0, equityRow)
    );

    if (headerRowIndex === -1) {
        return [];
    }

    const columns = getColumnIndexes(
        rows[headerRowIndex]
    );

    /*
     * We need at least a security/name column.
     *
     * ISIN and quantity may vary between disclosures. Don't reject the
     * entire sheet just because one isn't present.
     */
    if (columns.name === -1) {
        return [];
    }

    const result = [];

    for (
        let i = headerRowIndex + 1;
        i < rows.length;
        i++
    ) {
        const row = rows[i];

        if (!row || isRowEmpty(row)) {
            continue;
        }

        const section = findSectionInRow(row);

        /*
         * Another section means equity is over.
         *
         * Do not stop on another "equity" marker because some disclosures
         * can repeat the section label.
         */
        if (
            section &&
            section !== SECTION_TYPES.EQUITY
        ) {
            break;
        }

        const rawName =
            columns.name >= 0
                ? row[columns.name]
                : null;

        const name = cleanOriginal(rawName);

        if (!name) {
            continue;
        }

        if (looksLikeSubtotal(name)) {
            break;
        }

        /*
         * Some disclosures contain headings such as:
         *
         * "Equity Shares"
         * "Listed / Unlisted"
         * etc.
         *
         * Don't blindly treat every populated row as a holding.
         */
        const isin =
            columns.isin >= 0
                ? normalizeIsin(
                    row[columns.isin]
                )
                : '';

        const quantity =
            columns.quantity >= 0
                ? normalizeQuantity(
                    row[columns.quantity]
                )
                : null;

        /*
         * A row is considered a useful candidate if it has:
         *
         *   - a name, AND
         *   - an ISIN OR quantity
         *
         * This prevents notes/headers from becoming holdings while still
         * allowing validation to flag genuinely malformed holdings.
         */
        if (!isin && quantity === null) {
            continue;
        }

        result.push({
            name,
            isin,
            quantity
        });
    }

    return result;
}


/*
 * ---------------------------------------------------------------------------
 * Parse one sheet
 * ---------------------------------------------------------------------------
 */

function parseSheet(
    sheetName,
    worksheet
) {
    /*
     * First pass:
     *
     * Scan sparse XLSX cells only.
     */
    const sectionInfo =
        findSectionRows(worksheet);

    /*
     * No useful data.
     */
    if (!sectionInfo.hasMeaningfulCells || sectionInfo.debtRow === sectionInfo.equityRow + 1) {
        return {
            sheetName,
            fundName: null,
            reportDate: null,
            hasEquity: false,
            holdings: [],
        };
    }

    /*
     * If no equity section exists, don't materialize the worksheet.
     *
     * We still extract metadata from a small range because the UI may
     * want to display the fund/sheet information.
     */
    if (sectionInfo.equityRow === -1) {
        const metadataRange = {
            s: {
                r: sectionInfo.firstDataRow,
                c: sectionInfo.minColumn
            },
            e: {
                r: Math.min(
                    sectionInfo.lastDataRow,
                    sectionInfo.firstDataRow + 20
                ),
                c: sectionInfo.maxColumn
            }
        };

        const rows = XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: null,
                raw: true,
                range: metadataRange
            }
        );

        return {
            sheetName,
            fundName: findFundName(rows),
            reportDate: findReportDate(rows),
            hasEquity: false,
            holdings: []
        };
    }

    /*
     * Equity sheet:
     *
     * Materialize only the relevant region.
     */
    const rows = worksheetToRows(
        worksheet,
        sectionInfo
    );

    /*
     * The range may start before the actual equity section, so findFundName
     * and findReportDate still work as long as the metadata is nearby.
     *
     * If the equity section is far down the sheet, fall back to a small
     * metadata read below.
     */
    let fundName = findFundName(rows);
    let reportDate = findReportDate(rows);

    if (!fundName || !reportDate) {
        const metadataRange = {
            s: {
                r: sectionInfo.firstDataRow,
                c: sectionInfo.minColumn
            },
            e: {
                r: Math.min(
                    sectionInfo.lastDataRow,
                    sectionInfo.firstDataRow + 20
                ),
                c: sectionInfo.maxColumn
            }
        };

        const metadataRows =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    header: 1,
                    defval: null,
                    raw: true,
                    range: metadataRange
                }
            );

        fundName ??= findFundName(
            metadataRows
        );

        reportDate ??= findReportDate(
            metadataRows
        );
    }

    /*
     * IMPORTANT:
     *
     * worksheetToRows() can start at equityRow - HEADER_SEARCH_LIMIT.
     * Therefore the row index in `rows` is not necessarily the same as the
     * original worksheet row.
     *
     * Calculate the relative equity row.
     */
    const range = getActualRange(
        worksheet,
        sectionInfo
    );

    const relativeEquityRow = Math.max(
        0,
        sectionInfo.equityRow - range.s.r
    );

    const holdings = getEquityHolding(
        rows,
        {
            equityRow: relativeEquityRow
        }
    );

    return {
        sheetName,
        fundName,
        reportDate,
        hasEquity: holdings.length > 0 ? true : false,
        holdings,
        rows
    };
}


/*
 * ---------------------------------------------------------------------------
 * Workbook parser
 * ---------------------------------------------------------------------------
 */

export function parseWorkbook(workbook) {
    if (
        !workbook ||
        !Array.isArray(workbook.SheetNames)
    ) {
        return [];
    }

    const sheets = [];

    for (
        let i = 0;
        i < workbook.SheetNames.length;
        i++
    ) {
        const sheetName =
            workbook.SheetNames[i];

        const worksheet =
            workbook.Sheets[sheetName];

        if (!worksheet) {
            continue;
        }

        sheets.push(
            parseSheet(
                sheetName,
                worksheet
            )
        );
    }

    return sheets;
}


/*
 * ---------------------------------------------------------------------------
 * Optional helper: convert parsed sheets to holdings
 * ---------------------------------------------------------------------------
 */

export function flattenHoldings(sheets) {
    const unique = new Map();

    for (const sheet of sheets) {
        if (!sheet || !Array.isArray(sheet.holdings)) {
            continue;
        }

        for (const holding of sheet.holdings) {
            const isin = String(holding.isin ?? '')
                .trim()
                .toUpperCase();

            if (!isin) {
                continue;
            }

            const quantity = Number(holding.quantity) || 0;
            const existing = unique.get(isin);

            if (!existing) {
                unique.set(isin, {
                    ...holding,
                    isin,
                    quantity
                });
            } else {
                unique.set(isin, {
                    ...existing,
                    quantity: existing.quantity + quantity
                });
            }

        }
    }

    return [...unique.values()];
}

