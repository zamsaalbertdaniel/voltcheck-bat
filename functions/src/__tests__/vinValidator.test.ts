import { validateVIN, sanitizeVIN } from '../utils/vinValidator';

describe('VIN Validator (ISO 3779)', () => {

    describe('validateVIN — valid inputs', () => {
        it('accepts a valid EU VIN', () => {
            expect(validateVIN('WVWZZZE3ZWE654321')).toEqual({ valid: true });
        });

        it('accepts a valid US VIN', () => {
            expect(validateVIN('5YJ3E1EA1NF123456')).toEqual({ valid: true });
        });

        it('accepts lowercase input (normalized internally)', () => {
            expect(validateVIN('wvwzzze3zwe654321')).toEqual({ valid: true });
        });

        it('accepts VIN with leading/trailing whitespace', () => {
            expect(validateVIN('  WVWZZZE3ZWE654321  ')).toEqual({ valid: true });
        });
    });

    describe('validateVIN — invalid inputs', () => {
        it('rejects empty string → REQUIRED', () => {
            expect(validateVIN('')).toMatchObject({ valid: false, code: 'REQUIRED' });
        });

        it('rejects null-like → REQUIRED', () => {
            expect(validateVIN(null as any)).toMatchObject({ valid: false, code: 'REQUIRED' });
        });

        it('rejects VIN shorter than 17 chars → LENGTH', () => {
            expect(validateVIN('WVWZZZE3ZWE')).toMatchObject({ valid: false, code: 'LENGTH' });
        });

        it('rejects VIN longer than 17 chars → LENGTH', () => {
            expect(validateVIN('WVWZZZE3ZWE654321EXTRA')).toMatchObject({ valid: false, code: 'LENGTH' });
        });

        it('rejects VIN with special characters → CHARACTERS', () => {
            expect(validateVIN('WVWZZZE3ZWE6543!')).toMatchObject({ valid: false, code: 'CHARACTERS' });
        });

        it('rejects VIN with space → CHARACTERS', () => {
            expect(validateVIN('WVWZZZE3ZWE 4321')).toMatchObject({ valid: false, code: 'CHARACTERS' });
        });

        it('rejects VIN containing I → FORBIDDEN_CHARS', () => {
            expect(validateVIN('WVWZZZE3IWE654321')).toMatchObject({ valid: false, code: 'FORBIDDEN_CHARS' });
        });

        it('rejects VIN containing O → FORBIDDEN_CHARS', () => {
            expect(validateVIN('WVWZZZE3OWE654321')).toMatchObject({ valid: false, code: 'FORBIDDEN_CHARS' });
        });

        it('rejects VIN containing Q → FORBIDDEN_CHARS', () => {
            expect(validateVIN('WVWZZZE3QWE654321')).toMatchObject({ valid: false, code: 'FORBIDDEN_CHARS' });
        });
    });

    describe('sanitizeVIN', () => {
        it('converts to uppercase', () => {
            expect(sanitizeVIN('wvwzzze3zwe654321')).toBe('WVWZZZE3ZWE654321');
        });

        it('strips forbidden ISO chars I, O, Q', () => {
            expect(sanitizeVIN('WIOQ')).toBe('W');
        });

        it('strips special characters and spaces', () => {
            expect(sanitizeVIN('WVW-ZZZ E3Z!WE')).toBe('WVWZZZE3ZWE');
        });

        it('truncates to 17 characters', () => {
            const long = 'WVWZZZE3ZWE654321EXTRADATA';
            expect(sanitizeVIN(long)).toHaveLength(17);
            expect(sanitizeVIN(long)).toBe('WVWZZZE3ZWE654321');
        });

        it('handles already clean VIN unchanged', () => {
            expect(sanitizeVIN('WVWZZZE3ZWE654321')).toBe('WVWZZZE3ZWE654321');
        });
    });
});
