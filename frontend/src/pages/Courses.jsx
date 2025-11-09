export default function Courses() {
  // Mock data - will be replaced with API call
  const courses = [
    {
      id: 1,
      title: "React Masterclass",
      description: "Learn React from basics to advanced concepts",
      instructor: "John Doe",
      price: "$49.99",
      rating: 4.8
    },
    {
      id: 2,
      title: "Node.js Backend Development",
      description: "Build scalable backend applications with Node.js",
      instructor: "Jane Smith",
      price: "$59.99",
      rating: 4.6
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Courses</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div key={course.id} className="card hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{course.price}</span>
                <span className="text-yellow-500">⭐ {course.rating}</span>
              </div>
              <button className="w-full mt-4 btn-primary">
                Enroll Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}