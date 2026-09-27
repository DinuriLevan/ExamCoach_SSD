const getBadge = (type) => {
	const colors = {
		video: 'bg-red-100 text-red-700',
		pdf: 'bg-brand-50 text-brand-900',
		doc: 'bg-brand-50 text-brand-700',
		ppt: 'bg-orange-100 text-orange-700',
		link: 'bg-brand-50 text-brand-700',
		default: 'bg-gray-100 text-gray-700'
	};
	return colors[type] || colors.default;
};

const getType = (file = {}) => {
	if (file.isLink) return 'link';
	const format = (file.format || file.resourceType || '').toLowerCase();
	const nameExt = (file.originalName || file.url || '').toLowerCase().split('.').pop();
	const ext = format || nameExt;
	if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
	if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
	if (ext === 'pdf') return 'pdf';
	if (['doc', 'docx'].includes(ext)) return 'doc';
	if (['ppt', 'pptx'].includes(ext)) return 'ppt';
	return 'file';
};

const normalizeCloudinaryUrl = (url, type) => {
	if (!url || !url.includes('res.cloudinary.com')) return url;
	if (type === 'pdf' || type === 'doc' || type === 'ppt' || type === 'file') {
		return url
			.replace('/auto/', '/raw/')
			.replace('/image/upload/', '/raw/upload/')
			.replace('/video/upload/', '/raw/upload/')
			.replace('/raw/raw/upload/', '/raw/upload/');
	}
	return url;
};

const LessonView = ({ lessons = [], onDelete, onEdit }) => {
	if (!lessons.length) {
		return (
			<div className="bg-white rounded-xl shadow-md p-8 border border-dashed border-gray-200 text-center text-gray-500">
				No lessons uploaded yet.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{lessons.map((lesson) => (
				<div key={lesson._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h3 className="text-lg font-semibold text-gray-800">{lesson.title}</h3>
							{lesson.description && <p className="text-gray-600 text-sm mt-1">{lesson.description}</p>}
							<p className="text-xs text-gray-500 mt-2">By {lesson.createdBy?.name || 'Teacher'} • {new Date(lesson.createdAt).toLocaleDateString()}</p>
						</div>
						{(onDelete || onEdit) && (
							<button
								onClick={() => onEdit ? onEdit(lesson) : onDelete(lesson._id)}
								className="px-3 py-1 text-sm bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-300/20"
							>
								{onEdit ? 'Edit' : 'Delete'}
							</button>
						)}
						{onDelete && onEdit && (
							<button
								onClick={() => onDelete(lesson._id)}
								className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
							>
								Delete
							</button>
						)}
					</div>

					{lesson.materials?.length > 0 && (
						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
							{lesson.materials.map((file, idx) => {
								const type = getType(file);
								const href = normalizeCloudinaryUrl(file.url, type);
								const size = file.isLink ? 'Link' : (typeof file.size === 'number' ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Size N/A');
								return (
									<a
										key={file.publicId || file.url || idx}
										href={href}
										target="_blank"
										rel="noreferrer"
										className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition"
									>
										<span className={`px-2 py-1 text-xs font-semibold rounded ${getBadge(type)}`}>
											{type.toUpperCase()}
										</span>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-800 truncate">{file.originalName || file.url || 'Material'}</p>
											<p className="text-xs text-gray-500">{size}</p>
										</div>
										<span className="text-brand-700 text-sm">View</span>
									</a>
								);
							})}
						</div>
					)}
				</div>
			))}
		</div>
	);
};

export default LessonView;
