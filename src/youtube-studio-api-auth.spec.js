const nconf = require('nconf');
nconf.env().file({ file: './config.json' });

jest.mock('node-fetch', () => {
    return jest.fn()
    .mockResolvedValueOnce({
        text: () => '<html></html>'
    })
    .mockResolvedValueOnce({
        text: () => '<html><script>var a = 1;</script></html>'
    })
    .mockResolvedValueOnce({
        text: () => '<html><script>var ytcfg = {};</script>'
    })
    .mockResolvedValueOnce({
        text: () => { throw 'err on text parse' }
    })
});

const { init } = require('./youtube-studio-api');

const {
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
} = JSON.parse(nconf.get('GOOGLE_COOKIE'))


describe('studio api auth', () => {
    it('should return "could not find any script on main page" error message', async () => {
        try {
            await init({
                SID,
                HSID,
                SSID,
                APISID,
                SAPISID,
            })
            throw 'we should not be here...'
        } catch (err) {
            expect(err.text).toBe('could not find any script on main page')
        }
    })

    it('should return "could not find "ytcfg". Are you sure SID, HSID, SSID, APISID, SAPISID are correct?" error message', async () => {
        try {
            await init({
                SID,
                HSID,
                SSID,
                APISID,
                SAPISID,
            })
            throw 'we should not be here...'
        } catch (err) {
            expect(err.text).toBe('could not find "ytcfg". Are you sure SID, HSID, SSID, APISID, SAPISID are correct?')
        }
    });

    it('should return "could not retrive \"ytcfg\" from given script"', async () => {
        try {
            await init({
                SID,
                HSID,
                SSID,
                APISID,
                SAPISID,
            })
            throw 'we should not be here...'
        } catch (err) {
            expect(err.text).toBe('could not retrive \"ytcfg\" from given script')
        }
    });

    it('return error on page load problem', async () => {
        try {
            await init({
                SID,
                HSID,
                SSID,
                APISID,
                SAPISID,
            })
            throw 'we should not be here...'
        } catch (err) {
            expect(err).toEqual({
                text: 'failed to fetch main page',
                details: 'err on text parse'
            })
        }
    });
})