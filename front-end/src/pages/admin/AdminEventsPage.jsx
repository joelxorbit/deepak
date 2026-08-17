import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

export const AdminEventsPage = () => {
  const { events, addEvent, editEvent, deleteEvent } = useBooking();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TOURNAMENT');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory('TOURNAMENT');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setImage('https://lh3.googleusercontent.com/aida-public/AB6AXuB86XbRLPti-5LWlAYzGO9KQrkyXJWAjDfgHxoq3lZCn0Y9ju02S2AztwzAobXmyGj_s1GYwUJg2KOWkSFGYaHuF3Qdl3j_BaRe1rcN6HbWqwnWhS6MNV4k91hL2NCkb6SM1EilTrLveITdm6DYMNZo155RXDgHJ9j2sIUYglXVBudtFYQFh5teXhKB-G2lljASq8_6sUtq9twgXxI4_DGnND4J5aCX4ttXXMdjj6TeXtNCFWdzVRfqsw');
    setIsModalOpen(true);
  };

  const openEditModal = (eventObj) => {
    setEditingId(eventObj.id);
    setTitle(eventObj.title);
    setCategory(eventObj.category || 'TOURNAMENT');
    setDate(eventObj.date);
    setDescription(eventObj.description);
    setImage(eventObj.image);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) return;

    if (editingId) {
      editEvent(editingId, { title, category, date, description, image });
    } else {
      addEvent({ title, category, date, description, image });
    }
    setIsModalOpen(false);
  };

  // Mock file upload trigger
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In frontend mock, create object URL for uploaded image file preview
      const objectUrl = URL.createObjectURL(file);
      setImage(objectUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl">Completed Events Management</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">Add, edit, or delete past event showcases.</p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-primary text-on-primary font-label-bold px-5 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Add New Completed Event
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((evt) => (
          <div key={evt.id} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="aspect-[16/9] overflow-hidden relative">
                <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 bg-primary text-white text-xs font-label-bold px-3 py-1 rounded-full uppercase">
                  {evt.category || 'COMPLETED'}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-primary font-label-bold mb-1">{evt.date}</p>
                <h3 className="font-headline-md text-headline-md text-lg mb-2">{evt.title}</h3>
                <p className="text-on-surface-variant text-sm line-clamp-3">{evt.description}</p>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3 border-t border-black/5 mt-4 pt-4">
              <button
                onClick={() => openEditModal(evt)}
                className="flex-1 bg-surface-container border border-outline-variant text-on-surface text-xs font-label-bold py-2 rounded-xl hover:bg-surface-variant transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span> Edit
              </button>
              <button
                onClick={() => deleteEvent(evt.id)}
                className="bg-error-container text-on-error-container text-xs font-label-bold px-4 py-2 rounded-xl hover:bg-error/20 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary p-2"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline-lg text-headline-lg text-2xl mb-6">
              {editingId ? 'Edit Event Showcase' : 'Add Completed Event'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-label-sm font-label-bold text-on-surface mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-bold text-on-surface mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. TOURNAMENT, FRIENDLY, PARTY"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-bold text-on-surface mb-1">Completion Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-bold text-on-surface mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              {/* Image Upload Mock */}
              <div>
                <label className="block text-label-sm font-label-bold text-on-surface mb-1">Event Image</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="w-full text-xs text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-label-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  <input
                    type="url"
                    placeholder="Or enter Image URL"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                  {image && (
                    <div className="h-28 rounded-xl overflow-hidden border border-black/10 mt-2">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-container text-on-surface font-label-bold py-3 rounded-xl hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-on-primary font-label-bold py-3 rounded-xl hover:shadow-lg"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
