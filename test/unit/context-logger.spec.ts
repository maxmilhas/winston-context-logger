import { Logger } from 'winston';
import { ContextInfoProvider, ContextLogger } from '../../src';

const proto = ContextLogger.prototype;
interface MyMeta {
	k1: string;
	meta: number;
	lines: string[];
}

describe(ContextLogger.name, () => {
	let target: ContextLogger<MyMeta>;
	let logger: Logger;
	let contextProvider: ContextInfoProvider<any>;

	beforeEach(() => {
		logger = {} as any;
		contextProvider = {} as any;
		target = new ContextLogger(logger, contextProvider);
	});

	describe(proto.addMeta.name, () => {
		let meta: any;
		let getContextInfo: jest.SpyInstance;

		beforeEach(() => {
			getContextInfo = contextProvider.getContextInfo = jest
				.fn()
				.mockReturnValue(undefined);
			contextProvider.setContextInfo = jest
				.fn()
				.mockImplementation((v) => (meta = v));
		});

		it('should add meta creating new meta object, when none exists', () => {
			const result = target.addMeta('k1', 'v1');

			expect(result).toBeUndefined();
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(contextProvider.setContextInfo).toHaveCallsLike([meta]);
			expect(meta).toEqual({
				k1: 'v1',
			});
		});

		it('should add new meta property when a previous meta object exists', () => {
			meta = {
				prev: 123,
			};
			getContextInfo.mockReturnValue(meta);

			const result = target.addMeta('k1', 'v1');

			expect(result).toBeUndefined();
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(contextProvider.setContextInfo).toHaveCallsLike();
			expect(meta).toEqual({
				prev: 123,
				k1: 'v1',
			});
		});

		it('should add meta that expires after some logs when expiresCount is informed', () => {
			meta = {};
			getContextInfo.mockReturnValue(meta);
			logger.info = jest.fn();

			const result = target.addMeta('k1', 'v1', 3);
			target.info('log 1');
			target.info('log 2');
			target.info('log 3');
			target.info('log 4');

			expect(result).toBeUndefined();
			expect(logger.info).toHaveCallsLike(
				['log 1', { k1: 'v1' }],
				['log 2', { k1: 'v1' }],
				['log 3', { k1: 'v1' }],
				['log 4', {}],
			);
		});
	});

	describe(proto.incMeta.name, () => {
		let getContextInfo: jest.SpyInstance;

		beforeEach(() => {
			getContextInfo = contextProvider.getContextInfo = jest
				.fn()
				.mockReturnValue(undefined);
			jest.spyOn(target, 'addMeta').mockReturnValue(undefined);
		});

		it('should increment meta when no previous value is found', () => {
			const result = target.incMeta('meta', 9);

			expect(result).toBe(9);
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(target.addMeta).toHaveCallsLike(['meta', 9]);
		});

		it('should increment in 1 meta when no previous value is found and no value is informed', () => {
			const result = target.incMeta('meta');

			expect(result).toBe(1);
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(target.addMeta).toHaveCallsLike(['meta', 1]);
		});

		it('should increment meta when a previous value is found', () => {
			getContextInfo.mockReturnValue({ meta: 11 });

			const result = target.incMeta('meta', 9);

			expect(result).toBe(20);
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(target.addMeta).toHaveCallsLike(['meta', 20]);
		});

		it('should increment in 1 meta when a previous value is found and no value is informed', () => {
			getContextInfo.mockReturnValue({ meta: 11 });

			const result = target.incMeta('meta');

			expect(result).toBe(12);
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(target.addMeta).toHaveCallsLike(['meta', 12]);
		});
	});

	describe(proto.log.name, () => {
		let spy: jest.SpyInstance;

		beforeEach(() => {
			spy = (logger as any).anyMethod = jest.fn();
			(contextProvider as any).correlationId = '789';
			contextProvider.getContextInfo = jest
				.fn()
				.mockReturnValue({ baseMeta: 456 });
		});

		it('should call the correspondent level method joining metadatas', () => {
			const result = target.log('anyMethod' as any, 'my msg', { meta: 123 });

			expect(result).toBeUndefined();
			expect(contextProvider.getContextInfo).toHaveCallsLike([]);
			expect(spy).toHaveCallsLike([
				'my msg',
				{
					meta: 123,
					baseMeta: 456,
					correlationId: '789',
				},
			]);
		});
	});

	describe(proto.debug.name, () => {
		beforeEach(() => {
			jest.spyOn(target, 'log').mockReturnValue(undefined);
		});
		it('should call log with debug level', () => {
			const result = target.debug('my msg', { k1: 'my meta' });

			expect(result).toBeUndefined();
			expect(target.log).toHaveCallsLike([
				'debug',
				'my msg',
				{ k1: 'my meta' },
			]);
		});
	});

	describe(proto.info.name, () => {
		beforeEach(() => {
			jest.spyOn(target, 'log').mockReturnValue(undefined);
		});
		it('should call log with info level', () => {
			const result = target.info('my msg', { k1: 'my meta' });

			expect(result).toBeUndefined();
			expect(target.log).toHaveCallsLike(['info', 'my msg', { k1: 'my meta' }]);
		});
	});

	describe(proto.error.name, () => {
		beforeEach(() => {
			jest.spyOn(target, 'log').mockReturnValue(undefined);
		});
		it('should call log with error level', () => {
			const result = target.error('my msg', { k1: 'my meta' });

			expect(result).toBeUndefined();
			expect(target.log).toHaveCallsLike([
				'error',
				'my msg',
				{ k1: 'my meta' },
			]);
		});
	});

	describe(proto.warn.name, () => {
		beforeEach(() => {
			jest.spyOn(target, 'log').mockReturnValue(undefined);
		});
		it('should call log with warn level', () => {
			const result = target.warn('my msg', { k1: 'my meta' });

			expect(result).toBeUndefined();
			expect(target.log).toHaveCallsLike(['warn', 'my msg', { k1: 'my meta' }]);
		});
	});

	describe(proto.addDurationMeta.name, () => {
		beforeEach(() => {
			let i = 1;
			jest.spyOn(Date, 'now').mockImplementation(() => {
				i += 10;
				return i;
			});
			logger.info = jest.fn();
			const context: any = {};
			contextProvider.getContextInfo = jest.fn().mockReturnValue(context);
		});

		it('expect addDurationMeta to register spent duration seamlessly', () => {
			target.addDurationMeta('meta');

			target.info('duration 1');
			target.info('duration 2');
			target.info('duration 3');

			expect(logger.info).toHaveCallsLike(
				['duration 1', { meta: 10 }],
				['duration 2', { meta: 20 }],
				['duration 3', { meta: 30 }],
			);
		});
	});

	describe(proto.incTextMeta.name, () => {
		beforeEach(() => {
			logger.info = jest.fn();
			const context: any = {};
			contextProvider.getContextInfo = jest.fn().mockReturnValue(context);
		});

		it('expect addDurationMeta to register spent duration seamlessly', () => {
			target.incTextMeta('lines', 'first line');
			target.incTextMeta('lines', 'second line');
			target.incTextMeta('lines', 'third line');

			target.info('Message');

			expect(logger.info).toHaveCallsLike([
				'Message',
				{ lines: ['first line', 'second line', 'third line'] },
			]);
		});
	});
});
