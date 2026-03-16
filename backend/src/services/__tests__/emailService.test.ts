
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

describe('EmailService', () => {
    let EmailService: any;
    let sendMailMock: jest.Mock;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.SMTP_USER = 'test@example.com';
        process.env.SMTP_PASS = 'password';

        sendMailMock = jest.fn().mockResolvedValue('Email sent');
        
        jest.doMock('nodemailer', () => ({
            createTransport: jest.fn().mockReturnValue({
                sendMail: sendMailMock,
            })
        }));

        const module = require('../emailService');
        EmailService = module.EmailService;
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('envoyerEmail', () => {
        it('should send an email successfully', async () => {
            await EmailService.envoyerEmail('recipient@example.com', 'Subject', 'Content');

            expect(sendMailMock).toHaveBeenCalledTimes(1);
            expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
                to: 'recipient@example.com',
                subject: 'Subject',
                html: 'Content',
            }));
        });

        it('should handle attachments correctly', async () => {
            const attachment = {
                filename: 'test.txt',
                content: Buffer.from('hello'),
                contentType: 'text/plain',
            };

            await EmailService.envoyerEmail(
                'recipient@example.com',
                'Subject',
                'Content',
                attachment
            );

            expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
                attachments: [expect.objectContaining({
                    filename: 'test.txt',
                })],
            }));
        });

        it('should check for missing SMTP config', async () => {
             jest.resetModules();
             delete process.env.SMTP_USER;
             delete process.env.SMTP_PASS;

             jest.doMock('nodemailer', () => ({
                createTransport: jest.fn().mockReturnValue({
                    sendMail: sendMailMock,
                })
             }));

             const EmailServiceMissing = require('../emailService').EmailService;
             
             const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
             
             await EmailServiceMissing.envoyerEmail('recipient@example.com', 'Sub', 'Con');

             expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration SMTP manquante'));
             consoleSpy.mockRestore();
        });
    });
});
